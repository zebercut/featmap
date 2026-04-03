import * as fs from "fs";
import * as path from "path";
import { Feature, FeatureFilter, FeatureSortField, FEATURE_DIR_PATTERN, featureDirName, extractIdFromDir, slugify } from "./types";
import { validateFeature } from "./validator";
import { generateManifest } from "./index-generator";
import { generateHtml } from "./html-generator";

function featureReadmeTemplate(f: Feature, fileName: string): string {
  return `# ${f.id} — ${f.title}

**Status:** ${f.status}
**MoSCoW:** ${f.moscow}
**Category:** ${f.category}
${f.priority !== null ? `**Priority:** ${f.priority}  \n` : ""}\
${f.release ? `**Release:** ${f.release}  \n` : ""}\
${f.tags.length > 0 ? `**Tags:** ${f.tags.join(", ")}  \n` : ""}\
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

function atomicWrite(filePath: string, data: string): void {
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, data, "utf-8");
  fs.renameSync(tmp, filePath);
}

/** Find the directory for a feature by its ID (e.g. FEAT001). Scans for dirs starting with that prefix. */
export function findFeatureDir(featuresDir: string, id: string): string | null {
  if (!fs.existsSync(featuresDir)) return null;
  const entries = fs.readdirSync(featuresDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(id + "_")) return entry.name;
  }
  return null;
}

/** Find the .json data file inside a feature directory. */
function findJsonFile(dirPath: string): string | null {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    if (file.endsWith(".json") && !file.startsWith("_")) return file;
  }
  return null;
}

export function loadFeature(featuresDir: string, dirName: string): Feature | null {
  const dirPath = path.join(featuresDir, dirName);
  if (!fs.existsSync(dirPath)) return null;
  const jsonFile = findJsonFile(dirPath);
  if (!jsonFile) return null;
  const raw = JSON.parse(fs.readFileSync(path.join(dirPath, jsonFile), "utf-8"));
  const result = validateFeature(raw);
  if (!result.valid) {
    throw new Error(`Invalid feature ${dirName}: ${result.errors.join(", ")}`);
  }
  return raw as Feature;
}

export function loadFeatureById(featuresDir: string, id: string): Feature | null {
  const dirName = findFeatureDir(featuresDir, id);
  if (!dirName) return null;
  return loadFeature(featuresDir, dirName);
}

export function loadAllFeatures(featuresDir: string): Feature[] {
  if (!fs.existsSync(featuresDir)) return [];
  const entries = fs.readdirSync(featuresDir, { withFileTypes: true });
  const features: Feature[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !FEATURE_DIR_PATTERN.test(entry.name)) continue;
    try {
      const feature = loadFeature(featuresDir, entry.name);
      if (feature) features.push(feature);
    } catch (err) {
      console.warn(`Skipping invalid feature ${entry.name}: ${err}`);
    }
  }
  return features.sort((a, b) => {
    const pa = a.priority ?? 999;
    const pb = b.priority ?? 999;
    if (pa !== pb) return pa - pb;
    return a.id.localeCompare(b.id);
  });
}

export function filterFeatures(features: Feature[], filter: FeatureFilter): Feature[] {
  return features.filter((f) => {
    if (filter.category && f.category !== filter.category) return false;
    if (filter.moscow && f.moscow !== filter.moscow) return false;
    if (filter.status && f.status !== filter.status) return false;
    if (filter.release && f.release !== filter.release) return false;
    return true;
  });
}

export function sortFeatures(
  features: Feature[],
  by: FeatureSortField = "priority",
  order: "asc" | "desc" = "asc"
): Feature[] {
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

export function writeFeature(featuresDir: string, feature: Feature): void {
  const result = validateFeature(feature);
  if (!result.valid) {
    throw new Error(`Invalid feature data: ${result.errors.join(", ")}`);
  }
  const dirName = featureDirName(feature.id, feature.title);
  const dir = path.join(featuresDir, dirName);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const baseName = dirName;
  atomicWrite(path.join(dir, `${baseName}.json`), JSON.stringify(feature, null, 2) + "\n");

  const mdPath = path.join(dir, `${baseName}.md`);
  if (!fs.existsSync(mdPath)) {
    fs.writeFileSync(mdPath, featureReadmeTemplate(feature, baseName), "utf-8");
  }

  generateManifest(featuresDir);
  generateHtml(featuresDir, path.join(featuresDir, "..", "features.html"));
}

export function updateFeature(
  featuresDir: string,
  id: string,
  updates: Partial<Omit<Feature, "id">>
): Feature {
  const existing = loadFeatureById(featuresDir, id);
  if (!existing) throw new Error(`Feature ${id} not found`);

  const updated: Feature = {
    ...existing,
    ...updates,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  };

  // If title changed, rename the directory and files
  const oldDirName = findFeatureDir(featuresDir, id);
  const newDirName = featureDirName(id, updated.title);

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

export function nextFeatureId(featuresDir: string): string {
  const entries = fs.existsSync(featuresDir)
    ? fs.readdirSync(featuresDir).filter((e) => FEATURE_DIR_PATTERN.test(e))
    : [];
  const nums = entries.map((e) => {
    const id = extractIdFromDir(e);
    return id ? parseInt(id.slice(4), 10) : 0;
  });
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `FEAT${String(max + 1).padStart(3, "0")}`;
}
