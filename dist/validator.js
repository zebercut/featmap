"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFeature = validateFeature;
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const feature_schema_json_1 = __importDefault(require("../schema/feature.schema.json"));
const ajv = new ajv_1.default({ allErrors: true });
(0, ajv_formats_1.default)(ajv);
const validate = ajv.compile(feature_schema_json_1.default);
function validateFeature(data) {
    const valid = validate(data);
    if (valid) {
        return { valid: true, errors: [] };
    }
    const errors = (validate.errors ?? []).map((e) => `${e.instancePath || "root"}: ${e.message ?? "unknown error"}`);
    return { valid: false, errors };
}
