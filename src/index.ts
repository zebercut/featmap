// Core API
export {
  loadFeature,
  loadFeatureById,
  loadAllFeatures,
  filterFeatures,
  sortFeatures,
  writeFeature,
  updateFeature,
  nextFeatureId,
  findFeatureDir,
} from "./loader";

// Validation
export { validateFeature } from "./validator";

// Manifest
export { generateManifest } from "./index-generator";

// HTML
export { generateHtml, buildHtmlFromFeatures } from "./html-generator";

// Server
export { startServer } from "./server";

// Types
export type {
  Feature,
  FeatureManifest,
  FeatureManifestEntry,
  FeatureFilter,
  FeatureFilterKey,
  FeatureSortField,
  FeatureStatus,
  FeatureType,
  Complexity,
  MoSCoW,
} from "./types";
