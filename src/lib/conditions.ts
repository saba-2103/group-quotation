export interface VisibilityCondition {
    field: string;
    operator?: string;
    value: any;
}

/**
 * Evaluates a condition against a provided context object (form values, row data, etc.)
 */
export const evaluateCondition = (condition: VisibilityCondition | any, contextData: any): boolean => {
    if (!condition) return true;
    const { field, operator, value } = condition;
    const fieldValue = contextData[field];

    switch (operator) {
        case 'eq': return fieldValue === value;
        case 'neq': return fieldValue !== value;
        case 'gt': return Number(fieldValue) > Number(value);
        case 'lt': return Number(fieldValue) < Number(value);
        case 'gte': return Number(fieldValue) >= Number(value);
        case 'lte': return Number(fieldValue) <= Number(value);
        case 'in': return Array.isArray(value) && value.includes(fieldValue);
        case 'notIn': return Array.isArray(value) && !value.includes(fieldValue);
        // Default to checking for equality if no operator is matched or provided
        default: return fieldValue === value;
    }
};
