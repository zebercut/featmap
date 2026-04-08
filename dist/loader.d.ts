import { Feature, FeatureFilter, FeatureSortField, FeatureArtifact } from "./types";
/** Find the directory for a feature by its ID (e.g. FEAT001). Scans recursively. */
export declare function findFeatureDir(featuresDir: string, id: string): string | null;
/** Like findFeatureDir but returns the release subdirectory separately. */
export declare function findFeatureLocation(featuresDir: string, id: string): {
    dirName: string;
    releaseDir: string;
} | null;
export declare function loadFeature(featuresDir: string, dirNameOrRelative: string): Feature | null;
export declare function loadFeatureById(featuresDir: string, id: string): Feature | null;
export declare function loadAllFeatures(featuresDir: string): Feature[];
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
export declare function discoverArtifacts(featuresDir: string, relativePath: string): FeatureArtifact[];
export declare function filterFeatures(features: Feature[], filter: FeatureFilter): Feature[];
export declare function sortFeatures(features: Feature[], by?: FeatureSortField, order?: "asc" | "desc"): Feature[];
/**
 * Write a feature to disk. If the feature already exists, its location
 * (release subfolder, if any) is preserved. New features are written
 * under features/{release}/ if a release is set, otherwise at features/ root.
 */
export declare function writeFeature(featuresDir: string, feature: Feature): void;
export declare function updateFeature(featuresDir: string, id: string, updates: Partial<Omit<Feature, "id">>): Feature;
export declare function nextFeatureId(featuresDir: string): string;
