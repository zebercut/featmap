import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import { loadAllFeatures, updateFeature, findFeatureDir, discoverArtifacts } from "./loader";
import { buildHtmlFromFeatures, detectProjectName } from "./html-generator";
import { FEATURE_DIR_PATTERN, ARTIFACT_FILES } from "./types";

function findMdFile(dirPath: string): string | null {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    if (file.endsWith(".md") && !file.startsWith("_")) return file;
  }
  return null;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inlineMarkdown(text: string): string {
  // Escape HTML first to prevent XSS, then apply markdown transforms
  let s = escHtml(text);
  // Code spans (must be first — content inside should stay escaped)
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Bold before italic
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic with * (not **)
  s = s.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
  // Italic with _ — require word boundary to avoid mangling paths like some_file_name
  s = s.replace(/(?<=\s|^)_([^\s_](?:.*?[^\s_])?)_(?=\s|$|[.,;:!?)])/g, "<em>$1</em>");
  // Links (href was escaped, unescape entities back for URLs)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const href = url.replace(/&amp;/g, "&").replace(/&quot;/g, "%22").replace(/&lt;/g, "%3C").replace(/&gt;/g, "%3E");
    return `<a href="${href}" target="_blank">${label}</a>`;
  });
  return s;
}

function renderMarkdown(src: string): string {
  const lines = src.split("\n");
  const out: string[] = [];
  let inCode = false;
  let inTable = false;
  let inList = false;
  let listTag = "ul";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code blocks
    if (line.startsWith("```")) {
      if (inCode) { out.push("</code></pre>"); inCode = false; }
      else { out.push("<pre><code>"); inCode = true; }
      continue;
    }
    if (inCode) { out.push(escHtml(line) + "\n"); continue; }

    // Close list if not a list item
    const isUl = /^\s*[-*]\s/.test(line);
    const isOl = /^\s*\d+\.\s/.test(line);
    const isCheckbox = /^\s*[-*]\s\[[ x]\]\s/.test(line);
    if (inList && !isUl && !isOl && line.trim() !== "") {
      out.push(`</${listTag}>`); inList = false;
    }

    // Close table if not a table row
    if (inTable && !line.trim().startsWith("|")) {
      out.push("</tbody></table>"); inTable = false;
    }

    // Blank line
    if (line.trim() === "") continue;

    // Headings
    if (line.startsWith("### ")) { out.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`); continue; }
    if (line.startsWith("## ")) { out.push(`<h2>${inlineMarkdown(line.slice(3))}</h2>`); continue; }
    if (line.startsWith("# ")) { out.push(`<h1>${inlineMarkdown(line.slice(2))}</h1>`); continue; }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) { out.push("<hr>"); continue; }

    // Blockquote
    if (line.startsWith("> ")) { out.push(`<blockquote><p>${inlineMarkdown(line.slice(2))}</p></blockquote>`); continue; }

    // Table
    if (line.trim().startsWith("|") && line.includes("|")) {
      const cells = line.split("|").slice(1, -1).map(c => c.trim());
      const nextLine = lines[i + 1] || "";
      // Header row (next line is separator)
      if (/^\|[\s\-:|]+\|$/.test(nextLine.trim())) {
        if (!inTable) { out.push("<table>"); inTable = true; }
        out.push("<thead><tr>" + cells.map(c => `<th>${inlineMarkdown(c)}</th>`).join("") + "</tr></thead><tbody>");
        i++; // skip separator
        continue;
      }
      if (inTable) {
        out.push("<tr>" + cells.map(c => `<td>${inlineMarkdown(c)}</td>`).join("") + "</tr>");
        continue;
      }
    }

    // Checkbox list items
    if (isCheckbox) {
      if (!inList || listTag !== "ul") {
        if (inList) out.push(`</${listTag}>`);
        out.push("<ul>"); inList = true; listTag = "ul";
      }
      const content = line.replace(/^\s*[-*]\s/, "");
      if (content.startsWith("[x] ")) {
        out.push(`<li><input type="checkbox" checked disabled>${inlineMarkdown(content.slice(4))}</li>`);
      } else {
        out.push(`<li><input type="checkbox" disabled>${inlineMarkdown(content.slice(4))}</li>`);
      }
      continue;
    }

    // Unordered list
    if (isUl) {
      if (!inList || listTag !== "ul") {
        if (inList) out.push(`</${listTag}>`);
        out.push("<ul>"); inList = true; listTag = "ul";
      }
      out.push(`<li>${inlineMarkdown(line.replace(/^\s*[-*]\s/, ""))}</li>`);
      continue;
    }

    // Ordered list
    if (isOl) {
      if (!inList || listTag !== "ol") {
        if (inList) out.push(`</${listTag}>`);
        out.push("<ol>"); inList = true; listTag = "ol";
      }
      out.push(`<li>${inlineMarkdown(line.replace(/^\s*\d+\.\s/, ""))}</li>`);
      continue;
    }

    // Paragraph
    out.push(`<p>${inlineMarkdown(line)}</p>`);
  }

  if (inCode) out.push("</code></pre>");
  if (inList) out.push(`</${listTag}>`);
  if (inTable) out.push("</tbody></table>");
  return out.join("\n");
}

const MAX_BODY_SIZE = 65536; // 64KB

export function startServer(featuresDir: string, port: number = 3456, projectName?: string): void {
  projectName = projectName || detectProjectName(featuresDir);
  const sseClients: http.ServerResponse[] = [];
  let suppressBroadcast = false;
  const watchers: fs.FSWatcher[] = [];

  function broadcast() {
    if (suppressBroadcast) return;
    const alive: http.ServerResponse[] = [];
    for (const res of sseClients) {
      try {
        res.write("data: refresh\n\n");
        alive.push(res);
      } catch {
        // Dead client — drop it (#9)
      }
    }
    sseClients.length = 0;
    sseClients.push(...alive);
  }

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  function scheduleBroadcast() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => broadcast(), 300);
  }

  function watchFeatures() {
    // Close existing watchers before re-scanning (#2)
    for (const w of watchers) {
      try { w.close(); } catch { /* ignore */ }
    }
    watchers.length = 0;

    if (!fs.existsSync(featuresDir)) return;

    // Watch each feature subdirectory — supports both flat (features/FEAT*/)
    // and release-grouped (features/mvp/FEAT*/) layouts.
    const top = fs.readdirSync(featuresDir, { withFileTypes: true });
    for (const entry of top) {
      if (!entry.isDirectory()) continue;
      if (FEATURE_DIR_PATTERN.test(entry.name)) {
        // Flat layout
        try {
          const w = fs.watch(path.join(featuresDir, entry.name), scheduleBroadcast);
          watchers.push(w);
        } catch { /* ignore */ }
      } else if (!entry.name.startsWith("_") && !entry.name.startsWith(".")) {
        // Release subfolder — watch each feature folder inside
        const releaseDirPath = path.join(featuresDir, entry.name);
        try {
          const subEntries = fs.readdirSync(releaseDirPath, { withFileTypes: true });
          for (const sub of subEntries) {
            if (sub.isDirectory() && FEATURE_DIR_PATTERN.test(sub.name)) {
              try {
                const w = fs.watch(path.join(releaseDirPath, sub.name), scheduleBroadcast);
                watchers.push(w);
              } catch { /* ignore */ }
            }
          }
          // Also watch the release subfolder itself for new/deleted feature dirs
          try {
            const releaseWatcher = fs.watch(releaseDirPath, () => {
              scheduleBroadcast();
              setTimeout(() => watchFeatures(), 500);
            });
            watchers.push(releaseWatcher);
          } catch { /* ignore */ }
        } catch { /* ignore */ }
      }
    }

    // Watch root for new/deleted directories — re-scan watchers on change (#2)
    try {
      const rootWatcher = fs.watch(featuresDir, () => {
        scheduleBroadcast();
        setTimeout(() => watchFeatures(), 500);
      });
      watchers.push(rootWatcher);
    } catch { /* ignore */ }
  }

  function serveHtml(_req: http.IncomingMessage, res: http.ServerResponse): void {
    // #6: Single HTML template shared with html-generator
    const features = loadAllFeatures(featuresDir);
    const html = buildHtmlFromFeatures(features, { live: true, projectName });
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  }

  function readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = "";
      let size = 0;
      req.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_BODY_SIZE) {
          reject(new Error("Request body too large"));
          req.destroy();
          return;
        }
        body += chunk;
      });
      req.on("end", () => resolve(body));
      req.on("error", reject);
    });
  }

  function jsonResponse(res: http.ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify(data));
  }

  async function serveApi(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = req.url ?? "";

    // GET /api/features
    if (req.method === "GET" && url === "/api/features") {
      const features = loadAllFeatures(featuresDir);
      jsonResponse(res, 200, features);
      return;
    }

    // SSE /api/events
    if (req.method === "GET" && url === "/api/events") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });
      res.write("data: connected\n\n");
      sseClients.push(res);
      req.on("close", () => {
        const idx = sseClients.indexOf(res);
        if (idx !== -1) sseClients.splice(idx, 1);
      });
      return;
    }

    // GET /api/features/:id/artifacts — list discovered artifact files for a feature
    const artifactsListMatch = url.match(/^\/api\/features\/(FEAT\d{3,})\/artifacts$/);
    if (req.method === "GET" && artifactsListMatch) {
      const id = artifactsListMatch[1];
      const relPath = findFeatureDir(featuresDir, id);
      if (!relPath) {
        jsonResponse(res, 404, { error: `Feature ${id} not found` });
        return;
      }
      const artifacts = discoverArtifacts(featuresDir, relPath);
      // Always include a "doc" entry for the legacy single-md fallback so the
      // detail panel always has at least one tab to show even for old features.
      if (artifacts.length === 0) {
        const dirPath = path.join(featuresDir, relPath);
        const legacyMd = findMdFile(dirPath);
        if (legacyMd) {
          artifacts.push({
            key: "spec",
            file: legacyMd,
            label: "Spec",
            path: path.join(relPath, legacyMd),
          });
        }
      }
      jsonResponse(res, 200, artifacts.map((a) => ({ key: a.key, file: a.file, label: a.label })));
      return;
    }

    // GET /api/features/:id/artifacts/:key — render a specific artifact as HTML
    const artifactDocMatch = url.match(/^\/api\/features\/(FEAT\d{3,})\/artifacts\/([a-zA-Z]+)$/);
    if (req.method === "GET" && artifactDocMatch) {
      const id = artifactDocMatch[1];
      const key = artifactDocMatch[2];
      const relPath = findFeatureDir(featuresDir, id);
      if (!relPath) {
        jsonResponse(res, 404, { error: `Feature ${id} not found` });
        return;
      }
      const def = ARTIFACT_FILES.find((a) => a.key === key);
      const dirPath = path.join(featuresDir, relPath);
      let filePath: string | null = null;
      if (def) {
        // Try prefixed filename first ({featureId}_{file}.md), then plain {file}.md
        const candidates = [`${id}_${def.file}`, def.file];
        for (const candidate of candidates) {
          const fullPath = path.join(dirPath, candidate);
          if (fs.existsSync(fullPath)) {
            filePath = fullPath;
            break;
          }
        }
      }
      // Fallback for legacy single-md when key === "spec"
      if (!filePath && key === "spec") {
        const legacyMd = findMdFile(dirPath);
        if (legacyMd) filePath = path.join(dirPath, legacyMd);
      }
      if (!filePath) {
        jsonResponse(res, 404, { error: `Artifact '${key}' not found for ${id}` });
        return;
      }
      const md = fs.readFileSync(filePath, "utf-8");
      const html = renderMarkdown(md);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Access-Control-Allow-Origin": "*" });
      res.end(html);
      return;
    }

    // GET /api/features/:id/doc — backward-compat endpoint, returns the spec/legacy md
    const docMatch = url.match(/^\/api\/features\/(FEAT\d{3,})\/doc$/);
    if (req.method === "GET" && docMatch) {
      const id = docMatch[1];
      const relPath = findFeatureDir(featuresDir, id);
      if (!relPath) {
        jsonResponse(res, 404, { error: `Feature ${id} not found` });
        return;
      }
      const dirPath = path.join(featuresDir, relPath);
      // Prefer prefixed spec ({id}_spec.md), then plain spec.md, then legacy single md
      let filePath: string | null = null;
      const candidates = [`${id}_spec.md`, "spec.md"];
      for (const candidate of candidates) {
        const fullPath = path.join(dirPath, candidate);
        if (fs.existsSync(fullPath)) {
          filePath = fullPath;
          break;
        }
      }
      if (!filePath) {
        const legacyMd = findMdFile(dirPath);
        if (legacyMd) filePath = path.join(dirPath, legacyMd);
      }
      if (!filePath) {
        jsonResponse(res, 404, { error: `No markdown file found for ${id}` });
        return;
      }
      const md = fs.readFileSync(filePath, "utf-8");
      const html = renderMarkdown(md);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Access-Control-Allow-Origin": "*" });
      res.end(html);
      return;
    }

    // POST /api/features/:id
    const updateMatch = url.match(/^\/api\/features\/(FEAT\d{3,})$/);
    if (req.method === "POST" && updateMatch) {
      const id = updateMatch[1];
      try {
        const body = await readBody(req);
        const updates = JSON.parse(body);

        // Sanitize: only allow known fields
        const allowed: Record<string, unknown> = {};
        if (updates.status !== undefined) allowed.status = updates.status;
        if (updates.moscow !== undefined) allowed.moscow = updates.moscow;
        if (updates.category !== undefined) allowed.category = updates.category;
        if (updates.release !== undefined) allowed.release = updates.release || null;
        if (updates.tags !== undefined) allowed.tags = updates.tags;
        if (updates.title !== undefined) allowed.title = updates.title;
        if (updates.okrLink !== undefined) allowed.okrLink = updates.okrLink || null;
        // #3: Parse priority as integer
        if (updates.priority !== undefined) {
          const p = updates.priority;
          allowed.priority = p === null || p === "" ? null : parseInt(String(p), 10);
        }
        if (updates.type !== undefined) allowed.type = updates.type;
        if (updates.description !== undefined) allowed.description = updates.description || null;
        if (updates.complexity !== undefined) allowed.complexity = updates.complexity || null;
        if (updates.progress !== undefined) {
          const prog = updates.progress;
          allowed.progress = prog === null || prog === "" ? 0 : parseInt(String(prog), 10);
        }
        if (updates.notes !== undefined) allowed.notes = updates.notes || null;
        if (updates.specFile !== undefined) allowed.specFile = updates.specFile || null;
        if (updates.githubIssue !== undefined) {
          const gi = updates.githubIssue;
          allowed.githubIssue = gi === null || gi === "" ? null : parseInt(String(gi), 10);
        }

        // #1: Suppress file-watcher broadcast during our own write
        suppressBroadcast = true;
        const updated = updateFeature(featuresDir, id, allowed);
        suppressBroadcast = false;

        jsonResponse(res, 200, updated);

        // Broadcast after our response, so the editing client gets the toast first
        broadcast();
      } catch (err: any) {
        suppressBroadcast = false;
        jsonResponse(res, 400, { error: err.message });
      }
      return;
    }

    // CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      res.end();
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  }

  const server = http.createServer((req, res) => {
    const url = req.url ?? "";
    if (url === "/" || url === "") {
      serveHtml(req, res);
    } else if (url.startsWith("/api/")) {
      serveApi(req, res).catch((err) => {
        if (!res.headersSent) {
          jsonResponse(res, 500, { error: err.message });
        }
      });
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  watchFeatures();

  const MAX_PORT_ATTEMPTS = 10;
  let attempt = 0;
  let currentPort = port;

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE" && attempt < MAX_PORT_ATTEMPTS) {
      attempt++;
      currentPort++;
      console.log(`Port ${currentPort - 1} in use, trying ${currentPort}...`);
      server.listen(currentPort);
    } else {
      console.error(`Failed to start server: ${err.message}`);
      process.exit(1);
    }
  });

  server.listen(currentPort, () => {
    console.log(`featmap server running at http://localhost:${currentPort}`);
    console.log(`Watching: ${featuresDir}`);
    console.log("Press Ctrl+C to stop");
  });
}
