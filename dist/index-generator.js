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
exports.generateManifest = generateManifest;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const types_1 = require("./types");
const validator_1 = require("./validator");
/**
 * Walk featuresDir to find all feature folders.
 * Supports flat layout (features/FEAT001_X) and release-grouped layout
 * (features/mvp/FEAT001_X, features/phase-2/FEAT060_Y).
 * Returns the relative path from featuresDir to each feature folder.
 */
function findAllFeatureRelPaths(featuresDir) {
    if (!fs.existsSync(featuresDir))
        return [];
    const result = [];
    const top = fs.readdirSync(featuresDir, { withFileTypes: true });
    for (const entry of top) {
        if (!entry.isDirectory())
            continue;
        if (types_1.FEATURE_DIR_PATTERN.test(entry.name)) {
            result.push(entry.name);
        }
        else if (!entry.name.startsWith("_") && !entry.name.startsWith(".")) {
            // Possible release subfolder
            try {
                const subEntries = fs.readdirSync(path.join(featuresDir, entry.name), { withFileTypes: true });
                for (const sub of subEntries) {
                    if (sub.isDirectory() && types_1.FEATURE_DIR_PATTERN.test(sub.name)) {
                        result.push(path.join(entry.name, sub.name));
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
function generateManifest(featuresDir) {
    const entries = [];
    const relPaths = findAllFeatureRelPaths(featuresDir);
    for (const relPath of relPaths) {
        const dirPath = path.join(featuresDir, relPath);
        let files;
        try {
            files = fs.readdirSync(dirPath);
        }
        catch {
            continue;
        }
        const jsonFile = files.find((f) => f.endsWith(".json") && !f.startsWith("_"));
        if (!jsonFile)
            continue;
        const fp = path.join(dirPath, jsonFile);
        try {
            const raw = JSON.parse(fs.readFileSync(fp, "utf-8"));
            const result = (0, validator_1.validateFeature)(raw);
            if (!result.valid) {
                console.warn(`Skipping invalid feature ${relPath}: ${result.errors.join(", ")}`);
                continue;
            }
            const f = raw;
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
                progress: f.progress,
            });
        }
        catch (err) {
            console.warn(`Skipping unreadable feature ${relPath}: ${err}`);
        }
    }
    entries.sort((a, b) => {
        const pa = a.priority ?? 999;
        const pb = b.priority ?? 999;
        if (pa !== pb)
            return pa - pb;
        return a.id.localeCompare(b.id);
    });
    const manifest = {
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
