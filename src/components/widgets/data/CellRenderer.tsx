import React from "react";
import { Badge } from "@/components/ui/badge";
import { ColumnConfig, ValueMapping } from "./DataTable/types";
import { DateDisplay } from "@/components/widgets/controls/dateWidget/DateDisplay";
import { BADGE_COLOR_TO_VARIANT } from "./DataTable/constants";
import { StateBadge } from "@/components/widgets/state/StateBadge";
import type { EntityKind } from "@/components/widgets/state/state-map";

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
            className="text-primary font-medium underline-offset-4 transition-all duration-150 hover:underline hover:text-primary/80"
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

    // Group PAS entity-state badge — colour + label sourced from state-map.ts
    // so list cells and detail headers stay in sync.
    case "state-badge": {
      const entity = (column.entity as EntityKind | undefined) ?? "quote";
      return <StateBadge entity={entity} state={String(value)} />;
    }

    case "number":
      return <span>{Number(value)}</span>;

    case "currency": {
      const num = Number(value);
      if (isNaN(num)) return <span>{String(value)}</span>;
      const currency = (column as { currency?: string }).currency ?? "USD";
      return (
        <span>
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
            maximumFractionDigits: 0,
          }).format(num)}
        </span>
      );
    }

    case "date":
      return <DateDisplay value={String(value)} />;

    default:
      return <span>{String(value)}</span>;
  }
};
