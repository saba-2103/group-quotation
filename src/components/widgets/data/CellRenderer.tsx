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

    // Boolean → small "Awaiting approval" warning chip when truthy.
    // The pulse on the dot is the cue for Checkers — "act on this."
    case "awaiting-approval": {
      if (!value) return <span className="text-muted-foreground">—</span>;
      return (
        <Badge variant="warning" className="gap-1.5">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-warning" />
          </span>
          Awaiting approval
        </Badge>
      );
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

    // Renders an array of {field, code, message} ingestion errors. Accepts
    // either a raw array OR an object shaped {errors: [...]} (the issuance
    // backend wraps the array under `.errors` and echoes parsed memberData
    // alongside — only the errors are user-relevant). Empty → muted dash.
    case "errors-list": {
      const raw = String(value);
      if (!raw) return <span className="text-muted-foreground">—</span>;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return <span className="text-muted-foreground">—</span>;
      }
      const list = Array.isArray(parsed)
        ? parsed
        : (parsed && typeof parsed === "object" && Array.isArray((parsed as { errors?: unknown }).errors))
          ? (parsed as { errors: unknown[] }).errors
          : [];
      if (list.length === 0) {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <ul className="space-y-0.5 text-sm">
          {list.map((e, i) => {
            const err = (e ?? {}) as { field?: string; code?: string; message?: string };
            return (
              <li key={i} className="leading-snug">
                {err.field ? <span className="font-medium text-foreground">{err.field}: </span> : null}
                <span className="text-destructive">{err.message ?? err.code ?? "Error"}</span>
              </li>
            );
          })}
        </ul>
      );
    }

    default:
      return <span>{String(value)}</span>;
  }
};
