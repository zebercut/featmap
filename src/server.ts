import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import { loadAllFeatures, updateFeature } from "./loader";
import { buildHtmlFromFeatures } from "./html-generator";
import { FEATURE_DIR_PATTERN } from "./types";

const MAX_BODY_SIZE = 65536; // 64KB

export function startServer(featuresDir: string, port: number = 3456): void {
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

    // Watch each feature subdirectory
    const dirs = fs.readdirSync(featuresDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (!dir.isDirectory() || !FEATURE_DIR_PATTERN.test(dir.name)) continue;
      try {
        const w = fs.watch(path.join(featuresDir, dir.name), scheduleBroadcast);
        watchers.push(w);
      } catch { /* ignore watch errors */ }
    }

    // Watch root for new/deleted directories — re-scan watchers on change (#2)
    try {
      const rootWatcher = fs.watch(featuresDir, () => {
        scheduleBroadcast();
        // Re-scan to pick up new feature directories
        setTimeout(() => watchFeatures(), 500);
      });
      watchers.push(rootWatcher);
    } catch { /* ignore */ }
  }

  function serveHtml(_req: http.IncomingMessage, res: http.ServerResponse): void {
    // #6: Single HTML template shared with html-generator
    const features = loadAllFeatures(featuresDir);
    const html = buildHtmlFromFeatures(features, { live: true });
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

    // POST /api/features/:id
    const updateMatch = url.match(/^\/api\/features\/(F\d{2,})$/);
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

  server.listen(port, () => {
    console.log(`featmap server running at http://localhost:${port}`);
    console.log(`Watching: ${featuresDir}`);
    console.log("Press Ctrl+C to stop");
  });
}
