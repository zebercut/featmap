"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARTIFACT_FILES = exports.FEATURE_ID_PATTERN = exports.FEATURE_DIR_PATTERN = void 0;
exports.slugify = slugify;
exports.featureDirName = featureDirName;
exports.extractIdFromDir = extractIdFromDir;
exports.FEATURE_DIR_PATTERN = /^FEAT\d{3,}_/;
exports.FEATURE_ID_PATTERN = /^FEAT\d{3,}$/;
function slugify(title) {
    return title
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .trim()
        .replace(/\s+/g, "_");
}
function featureDirName(id, title) {
    return `${id}_${slugify(title)}`;
}
function extractIdFromDir(dirName) {
    const match = dirName.match(/^(FEAT\d{3,})_/);
    return match ? match[1] : null;
}
/**
 * The default set of artifact files featmap looks for inside each feature folder.
 * Projects can override this list via packages/featmap/featmap.config.json.
 */
exports.ARTIFACT_FILES = [
    { key: "spec", file: "spec.md", label: "Spec" },
    { key: "designReview", file: "design-review.md", label: "Design Review" },
    { key: "codeReview", file: "code-review.md", label: "Code Review" },
    { key: "testPlan", file: "test-plan.md", label: "Test Plan" },
    { key: "testResults", file: "test-results.md", label: "Test Results" },
    { key: "executionPlan", file: "execution-plan.md", label: "Execution Plan" },
];
