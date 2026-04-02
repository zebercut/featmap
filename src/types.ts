export type MoSCoW = "MUST" | "SHOULD" | "COULD" | "WONT";
export type FeatureStatus = "Planned" | "In Progress" | "Done" | "Rejected";

export interface Feature {
  id: string;
  title: string;
  category: string;
  moscow: MoSCoW;
  priority: number | null;
  status: FeatureStatus;
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
}

export interface FeatureManifest {
  generatedAt: string;
  count: number;
  features: FeatureManifestEntry[];
}

export type FeatureFilterKey = "category" | "moscow" | "status";
export type FeatureFilter = Partial<Pick<Feature, FeatureFilterKey>>;
export type FeatureSortField = "priority" | "status" | "category" | "id";
