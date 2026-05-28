import * as z from "zod";
import {
  FormFieldConfig,
  FieldValidation,
  FieldSchema,
  FormValues,
} from "./types";
import { REQUIRED_RULE } from "./constants";

type SchemaApplier = (
  schema: FieldSchema,
  v: FieldValidation,
  isNumber: boolean,
  isStringType: boolean,
) => FieldSchema;

const VALIDATION_APPLIERS: Partial<
  Record<FieldValidation["rule"], SchemaApplier>
> = {
  required: (schema, v, _isNumber, isStringType) =>
    isStringType
      ? (schema as z.ZodString).min(1, {
          message: v.message ?? "This field is required",
        })
      : schema,
  min: (schema, v, isNumber) =>
    isNumber
      ? (schema as z.ZodNumber).min(Number(v.value), { message: v.message })
      : (schema as z.ZodString).min(Number(v.value), { message: v.message }),
  max: (schema, v, isNumber) =>
    isNumber
      ? (schema as z.ZodNumber).max(Number(v.value), { message: v.message })
      : (schema as z.ZodString).max(Number(v.value), { message: v.message }),
  // Refines a string schema so it must parse as JSON. Pairs with the
  // `json-textarea` field type, but is also usable on any string field
  // that carries a serialized JSON blob (e.g. the DMN mapping replace flow
  // tracked in PROP-0007).
  json: (schema, v, _isNumber, isStringType) =>
    isStringType
      ? (schema as z.ZodString).refine(
          (s: string) => {
            if (s == null || s === "") return true; // empty is allowed; pair with `required` if mandatory
            try {
              JSON.parse(s);
              return true;
            } catch {
              return false;
            }
          },
          { message: v.message ?? "Must be valid JSON" },
        ) as unknown as FieldSchema
      : schema,
};

export const isRequiredField = (field: FormFieldConfig): boolean =>
  field.validations?.some((v) => v.rule === REQUIRED_RULE) ?? false;

export const isFieldDisabled = (field: FormFieldConfig): boolean =>
  field.disabled === true;


const buildFieldSchema = (
  field: FormFieldConfig,
  required: boolean,
): z.ZodTypeAny => {
  // File fields carry a runtime `File` object (or null). They bypass the
  // string/number/boolean ladder; `required` is enforced via a refinement.
  if (field.type === "file") {
    const fileSchema: z.ZodTypeAny = z
      .any()
      .refine(
        (v) => !required || (typeof File !== 'undefined' && v instanceof File),
        { message: field.validations?.find((x) => x.rule === REQUIRED_RULE)?.message ?? `${field.label} is required` },
      );
    return required ? fileSchema : fileSchema.optional();
  }

  let schema: z.ZodTypeAny =
    field.type === "number"
      ? z.coerce.number()
      : field.type === "checkbox"
        ? z.boolean()
        : z.string();

  const isNumber = field.type === "number";
  const isStringType = field.type !== 'number' && field.type !== 'checkbox';

  field.validations?.forEach((v) => {
    schema =
      VALIDATION_APPLIERS[v.rule]?.(
        schema as FieldSchema,
        v,
        isNumber,
        isStringType,
      ) ?? schema;
  });

  const hasRequiredRule = field.validations?.some((v) => v.rule === REQUIRED_RULE);
  if (required && !hasRequiredRule && isStringType) {
    schema = (schema as z.ZodString).min(1, {
      message: `${field.label} is required`,
    });
  }

  return required ? schema : schema.optional();
};

export const buildFormSchema = (
  fields: FormFieldConfig[],
): z.ZodObject<z.ZodRawShape> => {
  const shape: Record<string, z.ZodTypeAny> = {};
  fields.forEach((field) => {
    shape[field.name] = buildFieldSchema(field, isRequiredField(field));
  });
  return z.object(shape);
};

export const buildDefaultValues = (fields: FormFieldConfig[]): FormValues => {
  const defaults: FormValues = {};
  fields.forEach((field) => {
    if (field.defaultValue !== undefined) {
      defaults[field.name] = field.defaultValue;
    } else if (field.type === "checkbox") {
      defaults[field.name] = false;
    } else if (field.type === "file") {
      defaults[field.name] = null;
    } else {
      defaults[field.name] = "";
    }
  });
  return defaults;
};
