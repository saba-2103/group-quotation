export const SCROLLABLE_COLUMN_THRESHOLD = 7;
export const MAX_INLINE_ACTIONS = 2;
export const MAX_BULK_ACTIONS = 4;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Maps schema valueMapping[].color tokens → Badge variant names.
// Badge variants available: default | secondary | destructive | outline | success | warning | info
export const BADGE_COLOR_TO_VARIANT: Record<string, string> = {
  success: "success",
  warning: "warning",
  error: "destructive",
  info: "info",
  default: "outline",
  secondary: "secondary",
  destructive: "destructive",
};

// Export presentation constants — not business data, purely UI styling.
export const EXPORT_STYLE_CONFIG = {
  icons: {
    excel: "text-green-600",
    pdf: "text-red-500",
  },
  pdf: {
    headerFillColor: "#1e1e1e",
    headerTextColor: "#ffffff",
    alternateRowColor: "#f5f5f5",
    font: "Roboto",
    orientation: "landscape" as const,
    fontSize: 9,
  },
  xlsx: {
    sheetName: "Export",
  },
} as const;
