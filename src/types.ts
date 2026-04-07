export type MoSCoW = "MUST" | "SHOULD" | "COULD" | "WONT";
export type FeatureStatus = "Planned" | "Design Reviewed" | "In Progress" | "Code Reviewed" | "Testing" | "Done" | "Rejected";
export type FeatureType = "feature" | "bug";
export type Complexity = "low" | "medium" | "high" | "very-high";

export const FEATURE_DIR_PATTERN = /^FEAT\d{3,}_/;
export const FEATURE_ID_PATTERN = /^FEAT\d{3,}$/;

export function slugify(title: string): string {
  return title
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

export function featureDirName(id: string, title: string): string {
  return `${id}_${slugify(title)}`;
}

export function extractIdFromDir(dirName: string): string | null {
  const match = dirName.match(/^(FEAT\d{3,})_/);
  return match ? match[1] : null;
}

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
  progress: number;
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
  progress: number;
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
export const ARTIFACT_FILES: readonly ArtifactDefinition[] = [
  { key: "spec",          file: "spec.md",            label: "Spec" },
  { key: "designReview",  file: "design-review.md",   label: "Design Review" },
  { key: "codeReview",    file: "code-review.md",     label: "Code Review" },
  { key: "testPlan",      file: "test-plan.md",       label: "Test Plan" },
  { key: "testResults",   file: "test-results.md",    label: "Test Results" },
  { key: "executionPlan", file: "execution-plan.md",  label: "Execution Plan" },
] as const;
