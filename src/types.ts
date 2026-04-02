export type MoSCoW = "MUST" | "SHOULD" | "COULD" | "WONT";
export type FeatureStatus = "Planned" | "In Progress" | "Done" | "Rejected";

export const FEATURE_DIR_PATTERN = /^F\d{2,}$/;

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
}

export interface FeatureManifest {
  generatedAt: string;
  count: number;
  features: FeatureManifestEntry[];
}

export type FeatureFilterKey = "category" | "moscow" | "status" | "release";
export type FeatureFilter = Partial<Pick<Feature, FeatureFilterKey>>;
export type FeatureSortField = "priority" | "status" | "category" | "id" | "release";
