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
  // When `parseJson` is true, the value resolved by `accessorKey` is treated
  // as a JSON-encoded string and parsed before rendering / sub-pathing.
  // `subPath` then drills into the parsed object (dotted path).
  // `nestedParseAt` lets a single sub-path also be a JSON-encoded string
  // (e.g. censusFileFormatJson → parsed → its `schemaJson` sub-field is
  // ALSO an encoded string).
  parseJson?: boolean;
  subPath?: string;
  nestedParseAt?: string;
  // For type="list" cells: dotted path inside each array item to use as the
  // displayed string. If unset, items are rendered via String(item).
  itemPath?: string;
  // For type="count" / "list" cells (singular/plural).
  unit?: string;
  unitPlural?: string;
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
