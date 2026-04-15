#!/usr/bin/env ts-node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const loader_1 = require("./loader");
const index_generator_1 = require("./index-generator");
const html_generator_1 = require("./html-generator");
const server_1 = require("./server");
function resolveFeaturesDir(flags) {
    if (flags.dir)
        return path.resolve(flags.dir);
    if (process.env.FEATMAP_DIR)
        return path.resolve(process.env.FEATMAP_DIR);
    return path.resolve("features");
}
function parseArgs(args) {
    const command = args[0] ?? "list";
    const positional = [];
    const flags = {};
    for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith("--")) {
            const eqIdx = arg.indexOf("=");
            if (eqIdx !== -1) {
                flags[arg.slice(2, eqIdx)] = arg.slice(eqIdx + 1);
            }
            else if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
                flags[arg.slice(2)] = args[++i];
            }
            else {
                flags[arg.slice(2)] = "true";
            }
        }
        else {
            positional.push(arg);
        }
    }
    return { command, positional, flags };
}
function pad(str, len) {
    return str.length >= len ? str.slice(0, len) : str + " ".repeat(len - str.length);
}
function printTable(features) {
    const header = ` ${pad("#", 8)}| ${pad("Feature", 40)}| ${pad("Type", 8)}| ${pad("Cat", 12)}| ${pad("MoSCoW", 8)}| ${pad("Cplx", 6)}| ${pad("Prio", 6)}| Status`;
    const sep = "-".repeat(header.length);
    console.log(header);
    console.log(sep);
    for (const f of features) {
        const prio = f.priority !== null ? String(f.priority) : "\u2014";
        const cplx = f.complexity ?? "\u2014";
        console.log(` ${pad(f.id, 8)}| ${pad(f.title, 40)}| ${pad(f.type, 8)}| ${pad(f.category, 12)}| ${pad(f.moscow, 8)}| ${pad(cplx, 6)}| ${pad(prio, 6)}| ${f.status}`);
    }
    console.log(`\n${features.length} feature(s)`);
}
function cmdList(featuresDir, flags) {
    let features = (0, loader_1.loadAllFeatures)(featuresDir);
    const filter = {};
    if (flags.status)
        filter.status = flags.status;
    if (flags.category)
        filter.category = flags.category;
    if (flags.moscow)
        filter.moscow = flags.moscow;
    if (flags.release)
        filter.release = flags.release;
    if (Object.keys(filter).length > 0)
        features = (0, loader_1.filterFeatures)(features, filter);
    if (flags.sort)
        features = (0, loader_1.sortFeatures)(features, flags.sort);
    printTable(features);
}
function cmdShow(featuresDir, positional) {
    const id = positional[0];
    if (!id) {
        console.error("Usage: show <id>");
        process.exit(1);
    }
    const feature = (0, loader_1.loadFeatureById)(featuresDir, id.toUpperCase());
    if (!feature) {
        console.error(`Feature ${id} not found`);
        process.exit(1);
    }
    console.log(JSON.stringify(feature, null, 2));
}
function cmdAdd(featuresDir, flags) {
    if (!flags.title || !flags.category || !flags.moscow) {
        console.error('Usage: add --title="..." --category="..." --moscow=MUST [--priority=N] [--tags=a,b] [--type=feature|bug] [--complexity=X]');
        process.exit(1);
    }
    const id = (0, loader_1.nextFeatureId)(featuresDir);
    const now = new Date().toISOString();
    const feature = {
        id,
        title: flags.title,
        category: flags.category,
        moscow: flags.moscow,
        priority: flags.priority ? parseInt(flags.priority, 10) : null,
        status: "Planned",
        release: flags.release ?? null,
        createdAt: now,
        updatedAt: now,
        tags: flags.tags ? flags.tags.split(",").map((t) => t.trim()) : [],
        okrLink: flags.okrLink ?? null,
        type: flags.type ?? "feature",
        description: flags.description ?? null,
        complexity: flags.complexity ?? null,
        notes: flags.notes ?? null,
        specFile: flags.specFile ?? null,
        githubIssue: flags.githubIssue ? parseInt(flags.githubIssue, 10) : null,
    };
    (0, loader_1.writeFeature)(featuresDir, feature);
    console.log(`Created ${id}: ${feature.title}`);
}
function cmdUpdate(featuresDir, positional, flags) {
    const id = positional[0];
    if (!id) {
        console.error('Usage: update <id> --status="In Progress" [--priority=N] [--moscow=X] [--type=X] [--complexity=X]');
        process.exit(1);
    }
    const updates = {};
    if (flags.status)
        updates.status = flags.status;
    if (flags.priority)
        updates.priority = parseInt(flags.priority, 10);
    if (flags.moscow)
        updates.moscow = flags.moscow;
    if (flags.title)
        updates.title = flags.title;
    if (flags.category)
        updates.category = flags.category;
    if (flags.tags)
        updates.tags = flags.tags.split(",").map((t) => t.trim());
    if (flags.okrLink)
        updates.okrLink = flags.okrLink;
    if (flags.release !== undefined)
        updates.release = flags.release || null;
    if (flags.type)
        updates.type = flags.type;
    if (flags.description !== undefined)
        updates.description = flags.description || null;
    if (flags.complexity)
        updates.complexity = flags.complexity;
    if (flags.notes !== undefined)
        updates.notes = flags.notes || null;
    if (flags.specFile !== undefined)
        updates.specFile = flags.specFile || null;
    if (flags.githubIssue !== undefined)
        updates.githubIssue = flags.githubIssue ? parseInt(flags.githubIssue, 10) : null;
    if (Object.keys(updates).length === 0) {
        console.error("No updates specified");
        process.exit(1);
    }
    const updated = (0, loader_1.updateFeature)(featuresDir, id.toUpperCase(), updates);
    console.log(`Updated ${updated.id}: ${updated.title} [${updated.status}]`);
}
function cmdRegen(featuresDir) {
    const manifest = (0, index_generator_1.generateManifest)(featuresDir);
    console.log(`Regenerated manifest: ${manifest.count} features`);
}
function cmdHtml(featuresDir, flags) {
    const outPath = flags.out ?? path.join(featuresDir, "..", "features.html");
    (0, html_generator_1.generateHtml)(featuresDir, outPath, { projectName: flags.name });
    console.log(`Generated ${outPath}`);
}
const STATUS_EMOJI = {
    "Done": "\u2705", // ✅
    "Testing": "\uD83E\uDDEA", // 🧪
    "Code Reviewed": "\uD83D\uDD0D", // 🔍
    "In Progress": "\uD83D\uDD04", // 🔄
    "Design Reviewed": "\uD83D\uDCD0", // 📐
    "Planned": "\uD83D\uDCCB", // 📋
    "Rejected": "\u274C", // ❌
};
function cmdReleasePlan(featuresDir, flags) {
    const features = (0, loader_1.loadAllFeatures)(featuresDir);
    const filtered = flags.release
        ? features.filter((f) => f.release === flags.release)
        : features;
    if (filtered.length === 0) {
        console.error(flags.release
            ? `No features found for release "${flags.release}"`
            : "No features found");
        process.exit(1);
    }
    // Group by release
    const byRelease = new Map();
    for (const f of filtered) {
        const rel = f.release ?? "(unreleased)";
        if (!byRelease.has(rel))
            byRelease.set(rel, []);
        byRelease.get(rel).push(f);
    }
    // Compute overall progress
    const total = filtered.length;
    const done = filtered.filter((f) => f.status === "Done").length;
    const inProgress = filtered.filter((f) => f.status === "In Progress" || f.status === "Code Reviewed" || f.status === "Testing").length;
    const planned = filtered.filter((f) => f.status === "Planned" || f.status === "Design Reviewed").length;
    const lines = [];
    lines.push(`# Release Plan`);
    lines.push("");
    lines.push(`**Generated:** ${new Date().toISOString().slice(0, 16).replace("T", " ")}`);
    lines.push(`**Source:** Auto-generated from \`features/_manifest.json\` by \`featmap release-plan\`. Do not edit manually.`);
    lines.push("");
    lines.push(`## Overview`);
    lines.push("");
    lines.push(`| Metric | Value |`);
    lines.push(`|---|---|`);
    lines.push(`| Total features | ${total} |`);
    lines.push(`| \u2705 Done | ${done} |`);
    lines.push(`| \uD83D\uDD04 In progress / review / test | ${inProgress} |`);
    lines.push(`| \uD83D\uDCCB Planned | ${planned} |`);
    lines.push("");
    // Sort releases: known order first (mvp, phase-2, phase-3, post-mvp), then alphabetical
    const releaseOrder = ["mvp", "phase-2", "phase-3", "post-mvp"];
    const sortedReleases = Array.from(byRelease.keys()).sort((a, b) => {
        const ai = releaseOrder.indexOf(a);
        const bi = releaseOrder.indexOf(b);
        if (ai !== -1 && bi !== -1)
            return ai - bi;
        if (ai !== -1)
            return -1;
        if (bi !== -1)
            return 1;
        return a.localeCompare(b);
    });
    for (const release of sortedReleases) {
        const items = byRelease.get(release).slice().sort((a, b) => a.id.localeCompare(b.id));
        const releaseTotal = items.length;
        const releaseDone = items.filter((f) => f.status === "Done").length;
        const releaseProgress = Math.round((releaseDone / releaseTotal) * 100);
        lines.push(`## ${release} (${releaseDone}/${releaseTotal} done, ${releaseProgress}%)`);
        lines.push("");
        lines.push(`| ID | Feature | Status | MoSCoW | Complexity |`);
        lines.push(`|---|---|---|---|---|`);
        for (const f of items) {
            const emoji = STATUS_EMOJI[f.status] ?? "";
            lines.push(`| ${f.id} | ${f.title} | ${emoji} ${f.status} | ${f.moscow} | ${f.complexity ?? "\u2014"} |`);
        }
        lines.push("");
    }
    const md = lines.join("\n") + "\n";
    if (flags.out) {
        const outPath = path.resolve(flags.out);
        require("fs").writeFileSync(outPath, md, "utf-8");
        console.log(`Wrote release plan to ${outPath}`);
    }
    else {
        process.stdout.write(md);
    }
}
function cmdStats(featuresDir) {
    const features = (0, loader_1.loadAllFeatures)(featuresDir);
    const byStatus = {};
    const byCategory = {};
    const byMoscow = {};
    const byType = {};
    const byComplexity = {};
    for (const f of features) {
        byStatus[f.status] = (byStatus[f.status] ?? 0) + 1;
        byCategory[f.category] = (byCategory[f.category] ?? 0) + 1;
        byMoscow[f.moscow] = (byMoscow[f.moscow] ?? 0) + 1;
        byType[f.type] = (byType[f.type] ?? 0) + 1;
        if (f.complexity)
            byComplexity[f.complexity] = (byComplexity[f.complexity] ?? 0) + 1;
    }
    const done = byStatus["Done"] ?? 0;
    const pctDone = features.length > 0 ? Math.round((done / features.length) * 100) : 0;
    console.log(`Total: ${features.length} features | Done: ${done} (${pctDone}%)\n`);
    console.log("By Type:");
    for (const [k, v] of Object.entries(byType).sort())
        console.log(`  ${pad(k, 14)} ${v}`);
    console.log("\nBy Status:");
    for (const [k, v] of Object.entries(byStatus).sort())
        console.log(`  ${pad(k, 14)} ${v}`);
    console.log("\nBy Category:");
    for (const [k, v] of Object.entries(byCategory).sort())
        console.log(`  ${pad(k, 14)} ${v}`);
    console.log("\nBy MoSCoW:");
    for (const [k, v] of Object.entries(byMoscow).sort())
        console.log(`  ${pad(k, 14)} ${v}`);
    console.log("\nBy Complexity:");
    for (const [k, v] of Object.entries(byComplexity).sort())
        console.log(`  ${pad(k, 14)} ${v}`);
}
function printHelp() {
    console.log(`featmap - file-per-feature backlog management

Usage: featmap <command> [options]

Commands:
  list [--status=X] [--category=X] [--moscow=X] [--sort=X]   List features
  show <id>                                                    Show feature detail
  add --title="..." --category="..." --moscow=X [--priority=N] Add a feature
  update <id> --status="..." [--priority=N] [--moscow=X]       Update a feature
  regen                                                        Regenerate manifest
  html [--out=path]                                            Generate HTML viewer
  serve [--port=3456]                                          Start local server with live editing
  release-plan [--release=mvp] [--out=path]                    Generate release plan markdown
  stats                                                        Show summary counts
  help                                                         Show this help

Options:
  --dir=<path>    Path to features directory (default: ./features or $FEATMAP_DIR)
  --name=<name>   Project name shown in HTML header (auto-detected from package.json)`);
}
// --- Main ---
const args = process.argv.slice(2);
const { command, positional, flags } = parseArgs(args);
const featuresDir = resolveFeaturesDir(flags);
switch (command) {
    case "list":
        cmdList(featuresDir, flags);
        break;
    case "show":
        cmdShow(featuresDir, positional);
        break;
    case "add":
        cmdAdd(featuresDir, flags);
        break;
    case "update":
        cmdUpdate(featuresDir, positional, flags);
        break;
    case "regen":
        cmdRegen(featuresDir);
        break;
    case "html":
        cmdHtml(featuresDir, flags);
        break;
    case "serve":
        (0, server_1.startServer)(featuresDir, flags.port ? parseInt(flags.port, 10) : 3456, flags.name);
        break;
    case "release-plan":
        cmdReleasePlan(featuresDir, flags);
        break;
    case "stats":
        cmdStats(featuresDir);
        break;
    case "help":
    case "--help":
    case "-h":
        printHelp();
        break;
    default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
}
