import React from "react";
import { Badge } from "@/components/ui/badge";
import { ColumnConfig, ValueMapping } from "./DataTable/types";
import { BADGE_COLOR_TO_VARIANT } from "./DataTable/constants";

interface CellRendererProps {
  column: ColumnConfig;
  value: string | number | boolean | null | undefined;
  rowId?: string;
  onLinkClick?: (route: string, rowId: string) => void;
}

export const CellRenderer: React.FC<CellRendererProps> = ({ column, value, rowId, onLinkClick }) => {
  if (value === undefined || value === null) {
    return <span className="text-muted-foreground">-</span>;
  }

  switch (column.type) {
    case "link": {
      const isInteractive = column.linkRoute && rowId && onLinkClick;
      if (isInteractive) {
        return (
          <button
            type="button"
            className="text-primary hover:underline font-medium"
            onClick={() => onLinkClick(column.linkRoute!, rowId)}
          >
            {String(value)}
          </button>
        );
      }
      return <span className="text-primary font-medium">{String(value)}</span>;
    }

    case "badge":
    case "status": {
      const mapping = column.valueMapping?.find((m: ValueMapping) => m.value === String(value));
      const badgeVariant = mapping?.variant ?? BADGE_COLOR_TO_VARIANT[mapping?.color ?? ""] ?? "outline";
      return (
        <Badge variant={badgeVariant as Parameters<typeof Badge>[0]["variant"]}>
          {mapping?.label ?? String(value)}
        </Badge>
      );
    }

    case "number":
      return <span>{Number(value)}</span>;

    default:
      return <span>{String(value)}</span>;
  }
};
