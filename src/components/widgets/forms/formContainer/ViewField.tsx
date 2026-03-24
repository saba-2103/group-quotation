import React from 'react';
import { CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DateFormat } from '@/contexts/TenantConfigContext';
import { formatDateForDisplay } from '../../controls/dateWidget/utils';
import { FormFieldConfig, FormFieldValue } from './types';

interface ViewFieldProps {
    field: FormFieldConfig;
    value: FormFieldValue | undefined;
    dateFormat: DateFormat;
}

const EMPTY_DISPLAY = '—';

const YES_NO_VALUES = new Set(['yes', 'no']);

const getDisplayValue = (field: FormFieldConfig, value: FormFieldValue | undefined, dateFormat: DateFormat): string => {
    if (value === undefined || value === null || value === '') return EMPTY_DISPLAY;

    switch (field.type) {
        case 'select':
        case 'radio': {
            const option = field.options?.find((opt) => opt.value === String(value));
            return option?.label ?? String(value);
        }
        case 'checkbox':
            return value ? 'Yes' : 'No';
        case 'date':
            return formatDateForDisplay(String(value), dateFormat);
        default:
            return String(value);
    }
};

const isYesNoSelect = (field: FormFieldConfig): boolean =>
    (field.type === 'select' || field.type === 'radio') &&
    field.options?.length === 2 &&
    field.options.some((opt) => YES_NO_VALUES.has(opt.value)) === true;

const ViewField: React.FC<ViewFieldProps> = ({ field, value, dateFormat }) => {
    const displayValue = getDisplayValue(field, value, dateFormat);

    if (isYesNoSelect(field) || field.type === 'checkbox') {
        return <Badge variant="secondary">{displayValue}</Badge>;
    }

    if (field.type === 'date' && value) {
        return (
            <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-muted-foreground" />
                <span className="font-medium">{displayValue}</span>
            </div>
        );
    }

    return <p className="font-medium">{displayValue}</p>;
};

export default ViewField;
