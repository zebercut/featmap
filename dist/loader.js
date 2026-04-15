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
exports.findFeatureLocation = findFeatureLocation;
exports.loadFeature = loadFeature;
exports.loadFeatureById = loadFeatureById;
exports.loadAllFeatures = loadAllFeatures;
exports.discoverArtifacts = discoverArtifacts;
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
/**
 * Walk featuresDir recursively to find all feature folders.
 * Supports both flat layout (features/FEAT001_X) and release-grouped
 * layout (features/mvp/FEAT001_X, features/phase-2/FEAT060_Y).
 *
 * Returns entries of { dirName, releaseDir } where releaseDir is the
 * relative subdirectory containing the feature (empty string for flat layout).
 */
function findAllFeatureDirs(featuresDir) {
    if (!fs.existsSync(featuresDir))
        return [];
    const result = [];
    const top = fs.readdirSync(featuresDir, { withFileTypes: true });
    for (const entry of top) {
        if (!entry.isDirectory())
            continue;
        if (types_1.FEATURE_DIR_PATTERN.test(entry.name)) {
            // Flat layout: features/FEAT001_.../
            result.push({ dirName: entry.name, releaseDir: "" });
        }
        else if (!entry.name.startsWith("_") && !entry.name.startsWith(".")) {
            // Release subfolder: features/mvp/FEAT001_.../
            const releaseDir = entry.name;
            const subDirPath = path.join(featuresDir, releaseDir);
            try {
                const subEntries = fs.readdirSync(subDirPath, { withFileTypes: true });
                for (const sub of subEntries) {
                    if (sub.isDirectory() && types_1.FEATURE_DIR_PATTERN.test(sub.name)) {
                        result.push({ dirName: sub.name, releaseDir });
                    }
                }
            }
            catch {
                // Not a directory we can read; skip
            }
        }
    }
    return result;
}
/** Resolve a feature directory's full path given its dirName + releaseDir. */
function resolveFeaturePath(featuresDir, dirName, releaseDir) {
    return releaseDir
        ? path.join(featuresDir, releaseDir, dirName)
        : path.join(featuresDir, dirName);
}
function featureReadmeTemplate(f, fileName) {
    return `# ${f.id} — ${f.title}

**Type:** ${f.type}
**Status:** ${f.status}
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
/** Find the directory for a feature by its ID (e.g. FEAT001). Scans recursively. */
function findFeatureDir(featuresDir, id) {
    const all = findAllFeatureDirs(featuresDir);
    for (const entry of all) {
        if (entry.dirName.startsWith(id + "_")) {
            return entry.releaseDir
                ? path.join(entry.releaseDir, entry.dirName)
                : entry.dirName;
        }
    }
    return null;
}
/** Like findFeatureDir but returns the release subdirectory separately. */
function findFeatureLocation(featuresDir, id) {
    const all = findAllFeatureDirs(featuresDir);
    for (const entry of all) {
        if (entry.dirName.startsWith(id + "_"))
            return entry;
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
function loadFeature(featuresDir, dirNameOrRelative) {
    // dirNameOrRelative may be just "FEAT001_..." (flat) or "mvp/FEAT001_..." (nested)
    const dirPath = path.join(featuresDir, dirNameOrRelative);
    if (!fs.existsSync(dirPath))
        return null;
    const jsonFile = findJsonFile(dirPath);
    if (!jsonFile)
        return null;
    const raw = JSON.parse(fs.readFileSync(path.join(dirPath, jsonFile), "utf-8"));
    const result = (0, validator_1.validateFeature)(raw);
    if (!result.valid) {
        throw new Error(`Invalid feature ${dirNameOrRelative}: ${result.errors.join(", ")}`);
    }
    // If the feature lives in a release subfolder and its release field is empty,
    // populate it implicitly from the parent folder name.
    const feature = raw;
    const releaseDir = path.dirname(dirNameOrRelative);
    if (releaseDir && releaseDir !== "." && !feature.release) {
        feature.release = releaseDir;
    }
    return feature;
}
function loadFeatureById(featuresDir, id) {
    const relativePath = findFeatureDir(featuresDir, id);
    if (!relativePath)
        return null;
    return loadFeature(featuresDir, relativePath);
}
function loadAllFeatures(featuresDir) {
    const allDirs = findAllFeatureDirs(featuresDir);
    const features = [];
    for (const entry of allDirs) {
        const relativePath = entry.releaseDir
            ? path.join(entry.releaseDir, entry.dirName)
            : entry.dirName;
        try {
            const feature = loadFeature(featuresDir, relativePath);
            if (feature)
                features.push(feature);
        }
        catch (err) {
            console.warn(`Skipping invalid feature ${relativePath}: ${err}`);
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
/**
 * Discover artifact files inside a feature folder.
 *
 * Tries two filename patterns for each artifact key:
 *   1. `FEAT{NNN}_{artifact}.md`  (preferred — disambiguates files when copied)
 *   2. `{artifact}.md`            (fallback — works for any project)
 *
 * Examples for FEAT005 + key="designReview" (file="design-review.md"):
 *   - FEAT005_design-review.md   (prefix convention)
 *   - design-review.md           (plain convention)
 *
 * Returns only the artifacts that actually exist on disk. Stops at the first
 * match per artifact, so a folder shouldn't have both forms simultaneously.
 */
function discoverArtifacts(featuresDir, relativePath) {
    const dirPath = path.join(featuresDir, relativePath);
    if (!fs.existsSync(dirPath))
        return [];
    // Extract the feature ID from the folder name (e.g. "FEAT005_..." -> "FEAT005")
    const folderName = path.basename(relativePath);
    const featureId = (0, types_1.extractIdFromDir)(folderName);
    const result = [];
    for (const def of types_1.ARTIFACT_FILES) {
        const candidates = [];
        if (featureId)
            candidates.push(`${featureId}_${def.file}`);
        candidates.push(def.file);
        for (const candidate of candidates) {
            const fullPath = path.join(dirPath, candidate);
            if (fs.existsSync(fullPath)) {
                result.push({
                    key: def.key,
                    file: candidate,
                    label: def.label,
                    path: path.join(relativePath, candidate),
                });
                break;
            }
        }
    }
    return result;
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
/**
 * Write a feature to disk. If the feature already exists, its location
 * (release subfolder, if any) is preserved. New features are written
 * under features/{release}/ if a release is set, otherwise at features/ root.
 */
function writeFeature(featuresDir, feature) {
    const result = (0, validator_1.validateFeature)(feature);
    if (!result.valid) {
        throw new Error(`Invalid feature data: ${result.errors.join(", ")}`);
    }
    const dirName = (0, types_1.featureDirName)(feature.id, feature.title);
    // Preserve existing location if the feature already exists
    const existingLocation = findFeatureLocation(featuresDir, feature.id);
    const releaseDir = existingLocation
        ? existingLocation.releaseDir
        : feature.release || "";
    const dir = releaseDir
        ? path.join(featuresDir, releaseDir, dirName)
        : path.join(featuresDir, dirName);
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
    const baseName = dirName;
    atomicWrite(path.join(dir, `${baseName}.json`), JSON.stringify(feature, null, 2) + "\n");
    // Only create the legacy default md file if NO artifact files exist yet.
    // For migrated features that already have spec.md/design-review.md/etc,
    // we don't want to create a stale {dirName}.md alongside them.
    const hasAnyArtifact = types_1.ARTIFACT_FILES.some((a) => fs.existsSync(path.join(dir, a.file)));
    const legacyMdPath = path.join(dir, `${baseName}.md`);
    if (!fs.existsSync(legacyMdPath) && !hasAnyArtifact) {
        fs.writeFileSync(legacyMdPath, featureReadmeTemplate(feature, baseName), "utf-8");
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
    // If title changed, rename the directory and the JSON file (only).
    // Other files (spec.md, design-review.md, code-review.md, test-plan.md,
    // test-results.md, execution-plan.md) are NOT renamed — their names
    // are convention-based and not tied to the feature title.
    const location = findFeatureLocation(featuresDir, id);
    const oldDirName = location?.dirName;
    const releaseDir = location?.releaseDir || "";
    const newDirName = (0, types_1.featureDirName)(id, updated.title);
    if (oldDirName && oldDirName !== newDirName) {
        const parentDir = releaseDir ? path.join(featuresDir, releaseDir) : featuresDir;
        const oldDir = path.join(parentDir, oldDirName);
        const newDir = path.join(parentDir, newDirName);
        // Rename only the JSON metadata file inside the directory.
        // Match by exact name (the old dirName.json), not by extension —
        // that's what caused the original collision bug.
        const oldJsonName = `${oldDirName}.json`;
        const newJsonName = `${newDirName}.json`;
        const oldJsonPath = path.join(oldDir, oldJsonName);
        if (fs.existsSync(oldJsonPath)) {
            fs.renameSync(oldJsonPath, path.join(oldDir, newJsonName));
        }
        // Also rename the legacy default markdown file if it exists and matches
        // the old dirName (this is the file featmap auto-creates for new features).
        const oldLegacyMd = path.join(oldDir, `${oldDirName}.md`);
        if (fs.existsSync(oldLegacyMd)) {
            fs.renameSync(oldLegacyMd, path.join(oldDir, `${newDirName}.md`));
        }
        // Rename the directory itself.
        fs.renameSync(oldDir, newDir);
    }
    writeFeature(featuresDir, updated);
    return updated;
}
function nextFeatureId(featuresDir) {
    const all = findAllFeatureDirs(featuresDir);
    const nums = all.map((entry) => {
        const id = (0, types_1.extractIdFromDir)(entry.dirName);
        return id ? parseInt(id.slice(4), 10) : 0;
    });
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `FEAT${String(max + 1).padStart(3, "0")}`;
}
