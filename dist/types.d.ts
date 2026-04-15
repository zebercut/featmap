export type MoSCoW = "MUST" | "SHOULD" | "COULD" | "WONT";
export type FeatureStatus = "Planned" | "Design Reviewed" | "In Progress" | "Code Reviewed" | "Testing" | "Done" | "Rejected";
export type FeatureType = "feature" | "bug";
export type Complexity = "low" | "medium" | "high" | "very-high";
export declare const FEATURE_DIR_PATTERN: RegExp;
export declare const FEATURE_ID_PATTERN: RegExp;
export declare function slugify(title: string): string;
export declare function featureDirName(id: string, title: string): string;
export declare function extractIdFromDir(dirName: string): string | null;
export interface Feature {
    id: string;
    title: string;
    category: string;
    moscow: MoSCoW;
    priority: number | null;
    status: FeatureStatus;
    release: string | null;
    createdAt: string;
    updatedAt: string;
    tags: string[];
    okrLink: string | null;
    type: FeatureType;
    description: string | null;
    complexity: Complexity | null;
    notes: string | null;
    specFile: string | null;
    githubIssue: number | null;
}
export interface FeatureManifestEntry {
    id: string;
    title: string;
    category: string;
    moscow: MoSCoW;
    priority: number | null;
    status: FeatureStatus;
    release: string | null;
    tags: string[];
    type: FeatureType;
    complexity: Complexity | null;
}
export interface FeatureManifest {
    generatedAt: string;
    count: number;
    features: FeatureManifestEntry[];
}
export type FeatureFilterKey = "category" | "moscow" | "status" | "release";
export type FeatureFilter = Partial<Pick<Feature, FeatureFilterKey>>;
export type FeatureSortField = "priority" | "status" | "category" | "id" | "release";
/**
 * Artifact files discovered inside a feature folder by filename convention.
 * These are NOT part of the JSON schema — they're a runtime concept used
 * by the loader and server to render per-feature documentation tabs.
 */
export interface ArtifactDefinition {
    key: string;
    file: string;
    label: string;
}
export interface FeatureArtifact extends ArtifactDefinition {
    /** Path relative to featuresDir, e.g. "mvp/FEAT001_X/spec.md" */
    path: string;
}
/**
 * The default set of artifact files featmap looks for inside each feature folder.
 * Projects can override this list via packages/featmap/featmap.config.json.
 */
export declare const ARTIFACT_FILES: readonly ArtifactDefinition[];
