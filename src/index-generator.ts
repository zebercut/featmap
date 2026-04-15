import * as fs from "fs";
import * as path from "path";
import { Feature, FeatureManifest, FeatureManifestEntry, FEATURE_DIR_PATTERN } from "./types";
import { validateFeature } from "./validator";

/**
 * Walk featuresDir to find all feature folders.
 * Supports flat layout (features/FEAT001_X) and release-grouped layout
 * (features/mvp/FEAT001_X, features/phase-2/FEAT060_Y).
 * Returns the relative path from featuresDir to each feature folder.
 */
function findAllFeatureRelPaths(featuresDir: string): string[] {
  if (!fs.existsSync(featuresDir)) return [];
  const result: string[] = [];
  const top = fs.readdirSync(featuresDir, { withFileTypes: true });
  for (const entry of top) {
    if (!entry.isDirectory()) continue;
    if (FEATURE_DIR_PATTERN.test(entry.name)) {
      result.push(entry.name);
    } else if (!entry.name.startsWith("_") && !entry.name.startsWith(".")) {
      // Possible release subfolder
      try {
        const subEntries = fs.readdirSync(path.join(featuresDir, entry.name), { withFileTypes: true });
        for (const sub of subEntries) {
          if (sub.isDirectory() && FEATURE_DIR_PATTERN.test(sub.name)) {
            result.push(path.join(entry.name, sub.name));
          }
        }
      } catch {
        // Not a directory we can read; skip
      }
    }
  }
  return result;
}

export function generateManifest(featuresDir: string): FeatureManifest {
  const entries: FeatureManifestEntry[] = [];
  const relPaths = findAllFeatureRelPaths(featuresDir);

  for (const relPath of relPaths) {
    const dirPath = path.join(featuresDir, relPath);
    let files: string[];
    try {
      files = fs.readdirSync(dirPath);
    } catch {
      continue;
    }
    const jsonFile = files.find((f) => f.endsWith(".json") && !f.startsWith("_"));
    if (!jsonFile) continue;
    const fp = path.join(dirPath, jsonFile);
    try {
      const raw = JSON.parse(fs.readFileSync(fp, "utf-8"));
      const result = validateFeature(raw);
      if (!result.valid) {
        console.warn(`Skipping invalid feature ${relPath}: ${result.errors.join(", ")}`);
        continue;
      }
      const f = raw as Feature;
      // If release is empty in the JSON but the folder is in a release subdirectory,
      // populate release from the parent folder name (implicit).
      const parentDir = path.dirname(relPath);
      const implicitRelease = parentDir !== "." ? parentDir : null;
      entries.push({
        id: f.id,
        title: f.title,
        category: f.category,
        moscow: f.moscow,
        priority: f.priority,
        status: f.status,
        release: f.release || implicitRelease,
        tags: f.tags,
        type: f.type,
        complexity: f.complexity,
      });
    } catch (err) {
      console.warn(`Skipping unreadable feature ${relPath}: ${err}`);
    }
  }

  entries.sort((a, b) => {
    const pa = a.priority ?? 999;
    const pb = b.priority ?? 999;
    if (pa !== pb) return pa - pb;
    return a.id.localeCompare(b.id);
  });

  const manifest: FeatureManifest = {
    generatedAt: new Date().toISOString(),
    count: entries.length,
    features: entries,
  };

  const manifestPath = path.join(featuresDir, "_manifest.json");
  const tmp = manifestPath + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2) + "\n", "utf-8");
  fs.renameSync(tmp, manifestPath);

  return manifest;
}
