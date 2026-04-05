import { Feature, FeatureFilter, FeatureSortField } from "./types";
/** Find the directory for a feature by its ID (e.g. FEAT001). Scans for dirs starting with that prefix. */
export declare function findFeatureDir(featuresDir: string, id: string): string | null;
export declare function loadFeature(featuresDir: string, dirName: string): Feature | null;
export declare function loadFeatureById(featuresDir: string, id: string): Feature | null;
export declare function loadAllFeatures(featuresDir: string): Feature[];
export declare function filterFeatures(features: Feature[], filter: FeatureFilter): Feature[];
export declare function sortFeatures(features: Feature[], by?: FeatureSortField, order?: "asc" | "desc"): Feature[];
export declare function writeFeature(featuresDir: string, feature: Feature): void;
export declare function updateFeature(featuresDir: string, id: string, updates: Partial<Omit<Feature, "id">>): Feature;
export declare function nextFeatureId(featuresDir: string): string;
