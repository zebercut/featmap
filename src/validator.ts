import Ajv from "ajv";
import addFormats from "ajv-formats";
import featureSchema from "../schema/feature.schema.json";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const validate = ajv.compile(featureSchema);

export function validateFeature(data: unknown): { valid: boolean; errors: string[] } {
  const valid = validate(data);
  if (valid) {
    return { valid: true, errors: [] };
  }
  const errors = (validate.errors ?? []).map(
    (e) => `${e.instancePath || "root"}: ${e.message ?? "unknown error"}`
  );
  return { valid: false, errors };
}
