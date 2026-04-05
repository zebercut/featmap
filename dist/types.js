"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEATURE_ID_PATTERN = exports.FEATURE_DIR_PATTERN = void 0;
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
