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

/**
 * Heuristic: a yes/no select is any select whose options are exactly the pair
 * {yes, no} (case-insensitive on the value). Boolean-shaped enums get the
 * badge treatment automatically so callers don't have to remember to set
 * `displayStyle: 'badge'` on every yes/no field. Checkboxes also render as
 * badges since their semantics are inherently boolean.
 */
const isYesNoSelect = (field: FormFieldConfig): boolean => {
    if (field.type !== 'select' || !field.options || field.options.length !== 2) return false;
    const values = field.options.map((o) => String(o.value).toLowerCase()).sort();
    return values[0] === 'no' && values[1] === 'yes';
};

const ViewField: React.FC<ViewFieldProps> = ({ field, value, dateFormat }) => {
    const displayValue = getDisplayValue(field, value, dateFormat);

    const renderAsBadge =
        field.displayStyle === 'badge' ||
        field.type === 'checkbox' ||
        isYesNoSelect(field);

    if (renderAsBadge) {
        return <Badge variant="secondary">{displayValue}</Badge>;
    }

    if (field.displayStyle === 'date') {
        return value ? (
            <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-muted-foreground" />
                <span className="font-medium">{displayValue}</span>
            </div>
        ) : <p className="font-medium">{EMPTY_DISPLAY}</p>;
    }

    return <p className="font-medium">{displayValue}</p>;
};

export default ViewField;
