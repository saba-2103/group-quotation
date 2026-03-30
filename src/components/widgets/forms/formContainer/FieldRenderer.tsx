import React from 'react';
import { ControllerRenderProps, Path } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDatePicker } from '../../controls/dateWidget/CalendarDatePicker';
import { Dropdown } from '../../controls/searchDropDown/dropDown';
import { FormFieldConfig, FormValues } from './types';
import { NATIVE_INPUT_TYPES } from './constants';
import ViewField from './ViewField';
import { DateFormat } from '@/contexts/TenantConfigContext';

interface FieldRendererProps {
    field: FormFieldConfig;
    fieldProps: ControllerRenderProps<FormValues, Path<FormValues>>;
    isDisabled: boolean;
    isRequired: boolean;
    isViewMode: boolean;
    dateFormat: DateFormat;
}

const SelectField: React.FC<Pick<FieldRendererProps, 'field' | 'fieldProps' | 'isDisabled'>> = ({ field, fieldProps, isDisabled }) => (
    <Select onValueChange={fieldProps.onChange} value={fieldProps.value as string} disabled={isDisabled}>
        <SelectTrigger>
            <SelectValue placeholder={field.placeholder ?? 'Select an option'} />
        </SelectTrigger>
        <SelectContent>
            {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
        </SelectContent>
    </Select>
);

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
    textarea: ({ field, fieldProps, isDisabled }) => (
        <Textarea
            placeholder={field.placeholder}
            {...fieldProps}
            value={(fieldProps.value as string) ?? ''}
            disabled={isDisabled}
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
            variableCode={field.variableCode}
            entityId={field.entityId}
            language={field.language}
            mandatory={isRequired}
            value={(fieldProps.value as string) ?? ''}
            onChange={fieldProps.onChange}
            placeholder={field.placeholder}
            disabled={isDisabled}
        />
    ),
    'api-dropdown-transactional': ({ field, fieldProps, isDisabled, isRequired }) => (
        <Dropdown
            endpoint={field.endpoint}
            mandatory={isRequired}
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
