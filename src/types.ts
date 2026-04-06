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
