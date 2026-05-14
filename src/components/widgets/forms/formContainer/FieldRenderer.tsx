import React, { useMemo } from 'react';
import { ControllerRenderProps, Path } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDatePicker } from '../../controls/dateWidget/CalendarDatePicker';
import { Dropdown } from '../../controls/searchDropDown/dropDown';
import { FormFieldConfig, FormValues, SelectOption } from './types';
import { NATIVE_INPUT_TYPES } from './constants';
import ViewField from './ViewField';
import { DateFormat } from '@/contexts/TenantConfigContext';
import { useSmartQuery } from '@/hooks/useSmartQuery';
import { DmnRulesEditor } from './DmnRulesEditor';

interface FieldRendererProps {
    field: FormFieldConfig;
    fieldProps: ControllerRenderProps<FormValues, Path<FormValues>>;
    isDisabled: boolean;
    isRequired: boolean;
    isViewMode: boolean;
    dateFormat: DateFormat;
}

const SelectField: React.FC<Pick<FieldRendererProps, 'field' | 'fieldProps' | 'isDisabled'>> = ({ field, fieldProps, isDisabled }) => {
    // Two ways the field gets its options:
    //   1. `field.options` — static, schema-declared. Wins if present.
    //   2. `field.dataSource` + `field.optionLabel` / `field.optionValue` —
    //      fetch a list from the API and map each row to a {value,label}.
    // useSmartQuery is always called (hook order rule) but disabled when
    // dataSource is missing so it's a no-op.
    const query = useSmartQuery(field.dataSource);
    const options = useMemo<SelectOption[]>(() => {
        if (field.options && field.options.length > 0) return field.options;
        if (!field.dataSource) return [];
        const rows = query.data;
        if (!Array.isArray(rows) || !field.optionLabel || !field.optionValue) return [];
        return rows
            .map((row: Record<string, unknown>) => {
                const value = row[field.optionValue!];
                const label = row[field.optionLabel!];
                if (value === undefined || value === null) return null;
                return {
                    value: String(value),
                    label: label != null ? String(label) : String(value),
                };
            })
            .filter((opt): opt is SelectOption => opt !== null);
    }, [field.options, field.dataSource, field.optionLabel, field.optionValue, query.data]);

    const isFetching = Boolean(field.dataSource) && query.isLoading && options.length === 0;
    const placeholder = isFetching
        ? 'Loading…'
        : (field.placeholder ?? 'Select an option');

    return (
        <Select
            onValueChange={fieldProps.onChange}
            value={fieldProps.value as string}
            disabled={isDisabled || isFetching}
        >
            <SelectTrigger>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};

const RadioField: React.FC<Pick<FieldRendererProps, 'field' | 'fieldProps' | 'isDisabled'>> = ({ field, fieldProps, isDisabled }) => (
    <div className="flex flex-col space-y-2 mt-2">
        {field.options?.map((opt) => (
            <div className="flex items-center space-x-2" key={opt.value}>
                <input
                    type="radio"
                    id={`${field.name}-${opt.value}`}
                    value={opt.value}
                    checked={fieldProps.value === opt.value}
                    onChange={(e) => fieldProps.onChange(e.target.value)}
                    disabled={isDisabled}
                    className="w-4 h-4 text-primary disabled:cursor-not-allowed"
                />
                <label className="font-normal text-sm cursor-pointer" htmlFor={`${field.name}-${opt.value}`}>
                    {opt.label}
                </label>
            </div>
        ))}
    </div>
);

const formatFileSize = (bytes: number): string => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let value = bytes;
    while (value >= 1024 && i < units.length - 1) {
        value /= 1024;
        i++;
    }
    return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
};

const FileField: React.FC<Pick<FieldRendererProps, 'field' | 'fieldProps' | 'isDisabled'>> = ({ field, fieldProps, isDisabled }) => {
    const value = fieldProps.value;
    const selected = (typeof File !== 'undefined' && value instanceof File) ? value : null;
    return (
        <div className="flex flex-col gap-1.5">
            <input
                type="file"
                id={field.name}
                accept={field.accept}
                disabled={isDisabled}
                onChange={(e) => {
                    const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                    fieldProps.onChange(f);
                }}
                onBlur={fieldProps.onBlur}
                ref={fieldProps.ref}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {selected && (
                <p className="text-xs text-muted-foreground">
                    {selected.name} — {formatFileSize(selected.size)}
                </p>
            )}
        </div>
    );
};

const CheckboxField: React.FC<Pick<FieldRendererProps, 'field' | 'fieldProps' | 'isDisabled'>> = ({ field, fieldProps, isDisabled }) => (
    <div className="flex items-center space-x-2 mt-2">
        <input
            type="checkbox"
            checked={fieldProps.value as boolean}
            onChange={(e) => fieldProps.onChange(e.target.checked)}
            disabled={isDisabled}
            className="w-4 h-4 text-primary rounded disabled:cursor-not-allowed"
        />
        <label className="font-normal text-sm cursor-pointer leading-none">{field.label}</label>
    </div>
);

const FIELD_TYPE_MAP: Record<string, React.FC<FieldRendererProps>> = {
    select:   ({ field, fieldProps, isDisabled }) => <SelectField field={field} fieldProps={fieldProps} isDisabled={isDisabled} />,
    radio:    ({ field, fieldProps, isDisabled }) => <RadioField field={field} fieldProps={fieldProps} isDisabled={isDisabled} />,
    checkbox: ({ field, fieldProps, isDisabled }) => <CheckboxField field={field} fieldProps={fieldProps} isDisabled={isDisabled} />,
    file:     ({ field, fieldProps, isDisabled }) => <FileField field={field} fieldProps={fieldProps} isDisabled={isDisabled} />,
    textarea: ({ field, fieldProps, isDisabled }) => (
        <Textarea
            placeholder={field.placeholder}
            {...fieldProps}
            value={(fieldProps.value as string) ?? ''}
            disabled={isDisabled}
        />
    ),
    // Monospace textarea for JSON blobs. Pair with the `json` validation rule
    // (see formContainer/utils.ts) to reject invalid JSON on submit.
    'json-textarea': ({ field, fieldProps, isDisabled }) => (
        <Textarea
            placeholder={field.placeholder}
            {...fieldProps}
            value={(fieldProps.value as string) ?? ''}
            disabled={isDisabled}
            className="font-mono text-xs min-h-32"
            spellCheck={false}
        />
    ),
    // Row-per-rule DMN editor. Field value is the JSON string the backend
    // stores; the editor parses/serializes on every change. Plan options are
    // pre-filled by OverlaidForm.injectRowData from the quote's `plans`.
    'dmn-rules-editor': ({ field, fieldProps, isDisabled }) => (
        <DmnRulesEditor
            value={(fieldProps.value as string) ?? ''}
            onChange={fieldProps.onChange}
            onBlur={fieldProps.onBlur}
            disabled={isDisabled}
            plans={field.options}
            placeholder={field.placeholder}
        />
    ),
    date: ({ field, fieldProps, isDisabled }) => (
        <CalendarDatePicker
            value={(fieldProps.value as string) ?? ''}
            onChange={fieldProps.onChange}
            disabled={isDisabled}
            placeholder={field.placeholder ?? 'Select date'}
        />
    ),
    'api-dropdown': ({ field, fieldProps, isDisabled, isRequired }) => (
        <Dropdown
            value={(fieldProps.value as string) ?? ''}
            onChange={fieldProps.onChange}
            placeholder={field.placeholder}
            disabled={isDisabled}
        />
    ),
    'api-dropdown-transactional': ({ field, fieldProps, isDisabled, isRequired }) => (
        <Dropdown
            value={(fieldProps.value as string) ?? ''}
            onChange={fieldProps.onChange}
            placeholder={field.placeholder}
            disabled={isDisabled}
        />
    ),
};

const InputField: React.FC<FieldRendererProps> = ({ field, fieldProps, isDisabled }) => {
    const nativeType = field.type && NATIVE_INPUT_TYPES.includes(field.type as (typeof NATIVE_INPUT_TYPES)[number])
        ? field.type
        : 'text';

    return (
        <Input
            type={nativeType}
            placeholder={field.placeholder}
            {...fieldProps}
            value={(fieldProps.value as string) ?? ''}
            disabled={isDisabled}
        />
    );
};

const FieldRenderer: React.FC<FieldRendererProps> = (props) => {
    const { field, isViewMode, dateFormat, fieldProps } = props;

    if (isViewMode) {
        return <ViewField field={field} value={fieldProps.value} dateFormat={dateFormat} />;
    }

    const SpecificField = field.type ? FIELD_TYPE_MAP[field.type] : undefined;
    return SpecificField ? <SpecificField {...props} /> : <InputField {...props} />;
};

export default FieldRenderer;
