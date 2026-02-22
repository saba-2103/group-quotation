// Script to extract and transform form configs
import fs from 'fs';
import path from 'path';

const outDir = path.join(process.cwd(), 'schemas', 'forms');

function transformValidation(validation) {
    if (!validation) return undefined;
    const validations = [];
    if (validation.required) {
        validations.push({ rule: 'required', message: 'This field is required' });
    }
    if (validation.min !== undefined) {
        validations.push({ rule: 'min', value: validation.min, message: `Minimum value is ${validation.min}` });
    }
    if (validation.max !== undefined) {
        validations.push({ rule: 'max', value: validation.max, message: `Maximum value is ${validation.max}` });
    }
    return validations.length > 0 ? validations : undefined;
}

function transformCondition(dependsOn, dependsOnValue) {
    if (!dependsOn) return undefined;
    return {
        field: dependsOn,
        operator: 'eq',
        value: dependsOnValue === undefined ? true : dependsOnValue
    };
}

export function transformFormConfig(config) {
    const newSchema = {
        id: config.id,
        title: config.title,
        layout: config.layout,
        fields: config.fields.map(f => {
            const { validation, dependsOn, dependsOnValue, ...rest } = f;
            const newField = { ...rest };

            const validations = transformValidation(validation);
            if (validations) newField.validations = validations;

            const visibleWhen = transformCondition(dependsOn, dependsOnValue);
            if (visibleWhen) newField.visibleWhen = visibleWhen;

            return newField;
        }),
        actions: config.actions
    };

    fs.writeFileSync(path.join(outDir, `${config.id}.json`), JSON.stringify(newSchema, null, 2));
    console.log(`Wrote ${config.id}.json`);
}
