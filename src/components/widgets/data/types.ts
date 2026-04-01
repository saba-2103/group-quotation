export type FieldValue = string | number | boolean | null;
export type DataRecord = Record<string, FieldValue>;
export type ApiResponseData = Record<string, FieldValue | DataRecord>;

export interface KeyValueField {
  id: string;
  label: string;
  accessorKey: string;
  type?: string;
  icon?: string;
}

export interface KeyValueGridWidgetProps {
  fields?: KeyValueField[];
  data?: DataRecord;
  isLoading?: boolean;
  error?: string;
}
