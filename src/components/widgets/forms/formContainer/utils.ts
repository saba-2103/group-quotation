import * as z from "zod";
import {
  FormFieldConfig,
  FieldValidation,
  FieldSchema,
  VisibleWhenCondition,
  FormValues,
  ConditionValue,
  FormFieldValue,
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
};

export const isRequiredField = (field: FormFieldConfig): boolean =>
  field.validations?.some((v) => v.rule === REQUIRED_RULE) ?? false;

export const isFieldDisabled = (field: FormFieldConfig): boolean =>
  field.disabled === true;

const compareValues = (
  fieldValue: FormFieldValue | undefined,
  operator: VisibleWhenCondition["operator"],
  conditionValue: ConditionValue,
): boolean => {
  const numField = Number(fieldValue);
  const numCond = Number(conditionValue);

  switch (operator) {
    case "eq":
      return fieldValue === conditionValue;
    case "neq":
      return fieldValue !== conditionValue;
    case "gt":
      return numField > numCond;
    case "lt":
      return numField < numCond;
    case "gte":
      return numField >= numCond;
    case "lte":
      return numField <= numCond;
    case "in":
      return (
        Array.isArray(conditionValue) &&
        conditionValue.includes(fieldValue as string & number)
      );
    case "notIn":
      return (
        Array.isArray(conditionValue) &&
        !conditionValue.includes(fieldValue as string & number)
      );
    default:
      return true;
  }
};

export const evaluateCondition = (
  condition: VisibleWhenCondition | undefined,
  formValues: FormValues,
): boolean => {
  if (!condition) return true;
  return compareValues(
    formValues[condition.field],
    condition.operator,
    condition.value,
  );
};

const buildFieldSchema = (
  field: FormFieldConfig,
  required: boolean,
): z.ZodTypeAny => {
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
    } else {
      defaults[field.name] = "";
    }
  });
  return defaults;
};
