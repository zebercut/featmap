import * as fs from "fs";
import * as path from "path";
import { Feature, FeatureManifest, FeatureManifestEntry, FEATURE_DIR_PATTERN } from "./types";
import { validateFeature } from "./validator";

export function generateManifest(featuresDir: string): FeatureManifest {
  const entries: FeatureManifestEntry[] = [];

  if (fs.existsSync(featuresDir)) {
    const dirs = fs.readdirSync(featuresDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (!dir.isDirectory() || !FEATURE_DIR_PATTERN.test(dir.name)) continue;
      // Find the .json file inside the directory
      const dirPath = path.join(featuresDir, dir.name);
      const files = fs.readdirSync(dirPath);
      const jsonFile = files.find((f) => f.endsWith(".json") && !f.startsWith("_"));
      if (!jsonFile) continue;
      const fp = path.join(dirPath, jsonFile);
      try {
        const raw = JSON.parse(fs.readFileSync(fp, "utf-8"));
        const result = validateFeature(raw);
        if (!result.valid) {
          console.warn(`Skipping invalid feature ${dir.name}: ${result.errors.join(", ")}`);
          continue;
        }
        const f = raw as Feature;
        entries.push({
          id: f.id,
          title: f.title,
          category: f.category,
          moscow: f.moscow,
          priority: f.priority,
          status: f.status,
          release: f.release,
          tags: f.tags,
          type: f.type,
          complexity: f.complexity,
          progress: f.progress,
        });
      } catch (err) {
        console.warn(`Skipping unreadable feature ${dir.name}: ${err}`);
      }
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
