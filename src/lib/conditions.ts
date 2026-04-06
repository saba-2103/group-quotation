import jsonLogic from "json-logic-js";

export interface VisibilityCondition {
    field: string;
    operator?: string;
    value: any;
}

const toJsonLogic = (condition: VisibilityCondition) => {
    if (!condition) return true;
  
    const { field, operator = "eq", value } = condition;
    const varExpr = { var: field };
  
    switch (operator) {
      case "eq": return { "==": [varExpr, value] };
      case "neq": return { "!=": [varExpr, value] };
      case "gt": return { ">": [varExpr, value] };
      case "lt": return { "<": [varExpr, value] };
      case "gte": return { ">=": [varExpr, value] };
      case "lte": return { "<=": [varExpr, value] };
      case "in":
        if(!Array.isArray(value)) return false;
        return { "in": [varExpr, value] };
      case "notIn":
        if(!Array.isArray(value)) return false;
        return { "!": { "in": [varExpr, value] } };
      default: return { "==": [varExpr, value] };
    }
  };
  

/**
 * Evaluates a condition against a provided context object (form values, row data, etc.)
 */
export const evaluateCondition = (
    condition: VisibilityCondition | any,
    contextData: any
  ): boolean => {
    if (!condition) return true;
  
    const rule: any = toJsonLogic(condition);
    return jsonLogic.apply(rule, contextData);
  };
