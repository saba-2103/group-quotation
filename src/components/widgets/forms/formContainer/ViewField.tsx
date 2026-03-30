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

const ViewField: React.FC<ViewFieldProps> = ({ field, value, dateFormat }) => {
    const displayValue = getDisplayValue(field, value, dateFormat);

    switch (field.displayStyle) {
        case 'badge':
            return <Badge variant="secondary">{displayValue}</Badge>;
        case 'date':
            return value ? (
                <div className="flex items-center gap-2">
                    <CalendarIcon size={16} className="text-muted-foreground" />
                    <span className="font-medium">{displayValue}</span>
                </div>
            ) : <p className="font-medium">{EMPTY_DISPLAY}</p>;
        default:
            return <p className="font-medium">{displayValue}</p>;
    }
};

export default ViewField;
