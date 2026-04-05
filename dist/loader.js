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
exports.findFeatureDir = findFeatureDir;
exports.loadFeature = loadFeature;
exports.loadFeatureById = loadFeatureById;
exports.loadAllFeatures = loadAllFeatures;
exports.filterFeatures = filterFeatures;
exports.sortFeatures = sortFeatures;
exports.writeFeature = writeFeature;
exports.updateFeature = updateFeature;
exports.nextFeatureId = nextFeatureId;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const types_1 = require("./types");
const validator_1 = require("./validator");
const index_generator_1 = require("./index-generator");
function featureReadmeTemplate(f, fileName) {
    return `# ${f.id} — ${f.title}

**Type:** ${f.type}
**Status:** ${f.status} | **Progress:** ${f.progress}%
**MoSCoW:** ${f.moscow}${f.complexity ? ` | **Complexity:** ${f.complexity}` : ""}
**Category:** ${f.category}
${f.priority !== null ? `**Priority:** ${f.priority}  \n` : ""}\
${f.release ? `**Release:** ${f.release}  \n` : ""}\
${f.tags.length > 0 ? `**Tags:** ${f.tags.join(", ")}  \n` : ""}\
${f.specFile ? `**Spec:** ${f.specFile}  \n` : ""}\
${f.githubIssue ? `**GitHub Issue:** #${f.githubIssue}  \n` : ""}\
**Created:** ${f.createdAt.slice(0, 10)}

---

## Summary

_One-paragraph description of what this feature does and why it matters._

---

## Problem Statement

_What problem does this solve? What is broken or missing today?_

---

## User Stories

### Story 1
**As a** [user type], **I want** [action], **so that** [outcome].

**Acceptance Criteria:**
- [ ] Given [context], when [action], then [result]

---

## Workflow

_Describe the user flow or system flow step by step._

\`\`\`
Step 1 → Step 2 → Step 3
\`\`\`

---

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| _e.g. user cancels mid-flow_ | _return to previous state_ |

---

## Success Metrics

- _e.g. Reduce time-to-X by 50%_

---

## Out of Scope

- _What this feature deliberately does NOT cover_

---

## Architecture Notes

_Data models, API changes, component changes, dependencies._

---

## Implementation Notes

| File | Change |
|------|--------|
| | |

---

## Testing Notes

- [ ] Unit tests for _..._
- [ ] Integration test for _..._

---

## Open Questions

- _Unresolved decisions or unknowns_
`;
}
function atomicWrite(filePath, data) {
    const tmp = filePath + ".tmp";
    fs.writeFileSync(tmp, data, "utf-8");
    fs.renameSync(tmp, filePath);
}
/** Find the directory for a feature by its ID (e.g. FEAT001). Scans for dirs starting with that prefix. */
function findFeatureDir(featuresDir, id) {
    if (!fs.existsSync(featuresDir))
        return null;
    const entries = fs.readdirSync(featuresDir, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isDirectory())
            continue;
        if (entry.name.startsWith(id + "_"))
            return entry.name;
    }
    return null;
}
/** Find the .json data file inside a feature directory. */
function findJsonFile(dirPath) {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        if (file.endsWith(".json") && !file.startsWith("_"))
            return file;
    }
    return null;
}
function loadFeature(featuresDir, dirName) {
    const dirPath = path.join(featuresDir, dirName);
    if (!fs.existsSync(dirPath))
        return null;
    const jsonFile = findJsonFile(dirPath);
    if (!jsonFile)
        return null;
    const raw = JSON.parse(fs.readFileSync(path.join(dirPath, jsonFile), "utf-8"));
    const result = (0, validator_1.validateFeature)(raw);
    if (!result.valid) {
        throw new Error(`Invalid feature ${dirName}: ${result.errors.join(", ")}`);
    }
    return raw;
}
function loadFeatureById(featuresDir, id) {
    const dirName = findFeatureDir(featuresDir, id);
    if (!dirName)
        return null;
    return loadFeature(featuresDir, dirName);
}
function loadAllFeatures(featuresDir) {
    if (!fs.existsSync(featuresDir))
        return [];
    const entries = fs.readdirSync(featuresDir, { withFileTypes: true });
    const features = [];
    for (const entry of entries) {
        if (!entry.isDirectory() || !types_1.FEATURE_DIR_PATTERN.test(entry.name))
            continue;
        try {
            const feature = loadFeature(featuresDir, entry.name);
            if (feature)
                features.push(feature);
        }
        catch (err) {
            console.warn(`Skipping invalid feature ${entry.name}: ${err}`);
        }
    }
    return features.sort((a, b) => {
        const pa = a.priority ?? 999;
        const pb = b.priority ?? 999;
        if (pa !== pb)
            return pa - pb;
        return a.id.localeCompare(b.id);
    });
}
function filterFeatures(features, filter) {
    return features.filter((f) => {
        if (filter.category && f.category !== filter.category)
            return false;
        if (filter.moscow && f.moscow !== filter.moscow)
            return false;
        if (filter.status && f.status !== filter.status)
            return false;
        if (filter.release && f.release !== filter.release)
            return false;
        return true;
    });
}
function sortFeatures(features, by = "priority", order = "asc") {
    const sorted = [...features].sort((a, b) => {
        switch (by) {
            case "priority": {
                const pa = a.priority ?? 999;
                const pb = b.priority ?? 999;
                return pa - pb;
            }
            case "status":
                return a.status.localeCompare(b.status);
            case "category":
                return a.category.localeCompare(b.category);
            case "id":
                return a.id.localeCompare(b.id);
            case "release":
                return (a.release ?? "").localeCompare(b.release ?? "");
        }
    });
    return order === "desc" ? sorted.reverse() : sorted;
}
function writeFeature(featuresDir, feature) {
    const result = (0, validator_1.validateFeature)(feature);
    if (!result.valid) {
        throw new Error(`Invalid feature data: ${result.errors.join(", ")}`);
    }
    const dirName = (0, types_1.featureDirName)(feature.id, feature.title);
    const dir = path.join(featuresDir, dirName);
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
    const baseName = dirName;
    atomicWrite(path.join(dir, `${baseName}.json`), JSON.stringify(feature, null, 2) + "\n");
    const mdPath = path.join(dir, `${baseName}.md`);
    if (!fs.existsSync(mdPath)) {
        fs.writeFileSync(mdPath, featureReadmeTemplate(feature, baseName), "utf-8");
    }
    (0, index_generator_1.generateManifest)(featuresDir);
}
function updateFeature(featuresDir, id, updates) {
    const existing = loadFeatureById(featuresDir, id);
    if (!existing)
        throw new Error(`Feature ${id} not found`);
    const updated = {
        ...existing,
        ...updates,
        id: existing.id,
        updatedAt: new Date().toISOString(),
    };
    // If title changed, rename the directory and files
    const oldDirName = findFeatureDir(featuresDir, id);
    const newDirName = (0, types_1.featureDirName)(id, updated.title);
    if (oldDirName && oldDirName !== newDirName) {
        const oldDir = path.join(featuresDir, oldDirName);
        const newDir = path.join(featuresDir, newDirName);
        // Rename old files inside the directory first
        const files = fs.readdirSync(oldDir);
        for (const file of files) {
            const ext = path.extname(file);
            const newFile = `${newDirName}${ext}`;
            if (file !== newFile) {
                fs.renameSync(path.join(oldDir, file), path.join(oldDir, newFile));
            }
        }
        // Rename directory
        fs.renameSync(oldDir, newDir);
    }
    writeFeature(featuresDir, updated);
    return updated;
}
function nextFeatureId(featuresDir) {
    const entries = fs.existsSync(featuresDir)
        ? fs.readdirSync(featuresDir).filter((e) => types_1.FEATURE_DIR_PATTERN.test(e))
        : [];
    const nums = entries.map((e) => {
        const id = (0, types_1.extractIdFromDir)(e);
        return id ? parseInt(id.slice(4), 10) : 0;
    });
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `FEAT${String(max + 1).padStart(3, "0")}`;
}
