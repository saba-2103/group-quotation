import React, { useMemo } from 'react';
import { ControllerRenderProps, Path } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFormField } from '@/components/ui/form';
import { CalendarDatePicker } from '../../controls/dateWidget/CalendarDatePicker';
import { Dropdown } from '../../controls/searchDropDown/dropDown';
import { FormFieldConfig, FormValues, SelectOption } from './types';
import { NATIVE_INPUT_TYPES } from './constants';
import ViewField from './ViewField';
import { DateFormat } from '@/contexts/TenantConfigContext';
import { useSmartQuery } from '@/hooks/useSmartQuery';

interface FieldRendererProps {
    field: FormFieldConfig;
    fieldProps: ControllerRenderProps<FormValues, Path<FormValues>>;
    isDisabled: boolean;
    isRequired: boolean;
    isViewMode: boolean;
    dateFormat: DateFormat;
}

/**
 * Pull the id/aria attributes the parent <FormItem>/<FormControl> generated so
 * we can pass them to the actual focusable control. Without this the
 * shadcn <FormLabel htmlFor={formItemId}> would point at a non-existent id
 * (Radix Slot can't merge props through this component boundary).
 *
 * `aria-describedby` only references ids that will actually exist in the
 * rendered DOM: FormDescription renders only when `field.helperText` is set,
 * and FieldErrors renders only on error. Including dangling ids breaks
 * screen readers ("Pointing at unknown element").
 */
function useFieldA11yProps(opts: { hasHelperText: boolean }) {
    const { formItemId, formDescriptionId, formMessageId, error } = useFormField();
    const describedBy = [
        opts.hasHelperText ? formDescriptionId : undefined,
        error ? formMessageId : undefined,
    ].filter(Boolean).join(' ');
    return {
        id: formItemId,
        // Only emit aria-describedby when there's actually something to point at.
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
        'aria-invalid': Boolean(error),
    };
}

const SelectField: React.FC<Pick<FieldRendererProps, 'field' | 'fieldProps' | 'isDisabled'>> = ({ field, fieldProps, isDisabled }) => {
    const a11y = useFieldA11yProps({ hasHelperText: Boolean(field.helperText) });
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
            <SelectTrigger {...a11y}>
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

const RadioField: React.FC<Pick<FieldRendererProps, 'field' | 'fieldProps' | 'isDisabled'>> = ({ field, fieldProps, isDisabled }) => {
    const a11y = useFieldA11yProps({ hasHelperText: Boolean(field.helperText) });
    const { formLabelId } = useFormField();
    return (
        // <div role="radiogroup"> uses aria-labelledby to bind the parent
        // <FormLabel id={formLabelId}> as the group's accessible name. The
        // FormLabel's own htmlFor={formItemId} alone wouldn't work because
        // `htmlFor` only labels real form controls, not generic divs.
        <div
            role="radiogroup"
            id={a11y.id}
            aria-labelledby={formLabelId}
            aria-describedby={a11y['aria-describedby']}
            aria-invalid={a11y['aria-invalid']}
            className="flex flex-col space-y-2 mt-2"
        >
            {field.options?.map((opt) => (
                <div className="flex items-center space-x-2" key={opt.value}>
                    <input
                        type="radio"
                        id={`${field.name}-${opt.value}`}
                        name={field.name}
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
};

const CheckboxField: React.FC<Pick<FieldRendererProps, 'field' | 'fieldProps' | 'isDisabled'>> = ({ field, fieldProps, isDisabled }) => {
    const a11y = useFieldA11yProps({ hasHelperText: Boolean(field.helperText) });
    return (
        // The parent <FormLabel htmlFor={formItemId}> already labels this
        // checkbox via {...a11y}. Don't render a second inline label here —
        // assistive tech would announce the name twice.
        <div className="flex items-center space-x-2 mt-2">
            <input
                {...a11y}
                type="checkbox"
                checked={fieldProps.value as boolean}
                onChange={(e) => fieldProps.onChange(e.target.checked)}
                disabled={isDisabled}
                className="w-4 h-4 text-primary rounded disabled:cursor-not-allowed"
            />
        </div>
    );
};

const FIELD_TYPE_MAP: Record<string, React.FC<FieldRendererProps>> = {
    select:   ({ field, fieldProps, isDisabled }) => <SelectField field={field} fieldProps={fieldProps} isDisabled={isDisabled} />,
    radio:    ({ field, fieldProps, isDisabled }) => <RadioField field={field} fieldProps={fieldProps} isDisabled={isDisabled} />,
    checkbox: ({ field, fieldProps, isDisabled }) => <CheckboxField field={field} fieldProps={fieldProps} isDisabled={isDisabled} />,
    textarea: ({ field, fieldProps, isDisabled }) => {
        const a11y = useFieldA11yProps({ hasHelperText: Boolean(field.helperText) });
        return (
            <Textarea
                {...a11y}
                placeholder={field.placeholder}
                {...fieldProps}
                value={(fieldProps.value as string) ?? ''}
                disabled={isDisabled}
            />
        );
    },
    date: ({ field, fieldProps, isDisabled }) => {
        const a11y = useFieldA11yProps({ hasHelperText: Boolean(field.helperText) });
        return (
            <CalendarDatePicker
                {...a11y}
                value={(fieldProps.value as string) ?? ''}
                onChange={fieldProps.onChange}
                disabled={isDisabled}
                placeholder={field.placeholder ?? 'Select date'}
            />
        );
    },
    'api-dropdown': ({ field, fieldProps, isDisabled, isRequired }) => {
        const a11y = useFieldA11yProps({ hasHelperText: Boolean(field.helperText) });
        return (
            <Dropdown
                {...a11y}
                value={(fieldProps.value as string) ?? ''}
                onChange={fieldProps.onChange}
                placeholder={field.placeholder}
                disabled={isDisabled}
            />
        );
    },
    'api-dropdown-transactional': ({ field, fieldProps, isDisabled, isRequired }) => {
        const a11y = useFieldA11yProps({ hasHelperText: Boolean(field.helperText) });
        return (
            <Dropdown
                {...a11y}
                value={(fieldProps.value as string) ?? ''}
                onChange={fieldProps.onChange}
                placeholder={field.placeholder}
                disabled={isDisabled}
            />
        );
    },
};

const InputField: React.FC<FieldRendererProps> = ({ field, fieldProps, isDisabled }) => {
    const a11y = useFieldA11yProps({ hasHelperText: Boolean(field.helperText) });
    const nativeType = field.type && NATIVE_INPUT_TYPES.includes(field.type as (typeof NATIVE_INPUT_TYPES)[number])
        ? field.type
        : 'text';

    return (
        <Input
            {...a11y}
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
