export type FieldValue = string | number | boolean | null;
export type DataRecord = Record<string, FieldValue>;
export type ApiResponseData = Record<string, FieldValue | DataRecord>;

export interface BadgeValueMapping {
  value: string;
  label: string;
  color?: string;
  variant?: string;
}

export interface KeyValueField {
  id: string;
  label: string;
  accessorKey: string;
  type?: string;
  icon?: string;
  valueMapping?: BadgeValueMapping[];
}

export interface KeyValueGridWidgetProps {
  fields?: KeyValueField[];
  columns?: number;
  loadingMessage?: string;
  errorMessage?: string;
  data?: DataRecord;
  isLoading?: boolean;
  error?: string;
}
