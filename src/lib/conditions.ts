import jsonLogic from "json-logic-js";

export type VisibilityCondition = Record<string, unknown>;
  

/**
 * Evaluates a condition against a provided context object (form values, row data, etc.)
 */
export const evaluateCondition = (
    condition: VisibilityCondition | undefined | null,
    contextData: any
  ): boolean => {
    if (!condition) return true;
  
    return Boolean(jsonLogic.apply(condition, contextData));
  };
