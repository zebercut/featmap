#!/usr/bin/env node
/**
 * featmap — self-contained entrypoint
 *
 * Auto-detects:
 *   - features directory: ./features relative to cwd
 *   - project name: from nearest package.json "name" field
 *
 * Usage (from any host project root):
 *   node packages/featmap/featmap.js serve
 *   node packages/featmap/featmap.js list
 *   node packages/featmap/featmap.js stats
 *
 * All CLI flags still work:
 *   node packages/featmap/featmap.js serve --port=4000 --name=MyProject
 *   node packages/featmap/featmap.js list --status=Done
 */
const path = require("path");
const fs = require("fs");

// Resolve features dir: --dir flag > FEATMAP_DIR env > ./features from cwd
const args = process.argv.slice(2);
let hasDir = false;
for (const arg of args) {
  if (arg.startsWith("--dir=") || arg === "--dir") {
    hasDir = true;
    break;
  }
}

if (!hasDir && !process.env.FEATMAP_DIR) {
  const defaultDir = path.resolve(process.cwd(), "features");
  if (fs.existsSync(defaultDir)) {
    args.push("--dir=" + defaultDir);
  }
}

// Auto-detect project name if not specified
let hasName = false;
for (const arg of args) {
  if (arg.startsWith("--name=") || arg === "--name") {
    hasName = true;
    break;
  }
}

if (!hasName) {
  // Walk up from cwd to find package.json
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const pkg = path.join(dir, "package.json");
    if (fs.existsSync(pkg)) {
      try {
        const json = JSON.parse(fs.readFileSync(pkg, "utf-8"));
        if (json.name) {
          args.push("--name=" + json.name);
          break;
        }
      } catch { /* ignore */ }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
}

// Inject args back and run the compiled CLI
process.argv = [process.argv[0], process.argv[1], ...args];
require("./dist/cli.js");
