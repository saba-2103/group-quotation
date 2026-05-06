"use client";

import React from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActionRenderer } from "../../controls/ActionRenderer";
import { MAX_INLINE_ACTIONS } from "./constants";
import { RowActionsProps, RowActionConfig, TableRow as DataRow } from "./types";
import { ActionConfig } from "@/types/widget";
import { evaluateCondition } from "@/lib/conditions";

// Substitutes path tokens like ":id", ":referenceNo", ":taskRoute" with
// values from the row. Falls back to `rowId` for ":id" when the row has
// no explicit `id` field. Unknown tokens are left as-is so missing data
// is visible rather than silently producing a malformed URL.
const SUB_TOKEN = /:([a-zA-Z_][a-zA-Z0-9_]*)\b/g;

const substituteRowTokens = (input: string, row: DataRow, rowId: string): string =>
  input.replace(SUB_TOKEN, (match, key: string) => {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") {
      return String(value);
    }
    if (key === "id" && rowId) return rowId;
    return match;
  });

const injectRowTokens = (
  action: RowActionConfig,
  row: DataRow,
  rowId: string,
): RowActionConfig => {
  const sub = (s: string) => substituteRowTokens(s, row, rowId);
  return {
    ...action,
    ...("target" in action && { target: sub(action.target) }),
    ...("api" in action && action.api && {
      api: { ...action.api, endpoint: sub(action.api.endpoint) },
    }),
  } as RowActionConfig;
};

export const RowActions: React.FC<RowActionsProps> = ({
  row,
  rowActions,
  rowIdKey,
}) => {
  const rowId = String(row[rowIdKey] ?? "");

  const visibleActions = rowActions
    .filter((act) => evaluateCondition(act.visible, row))
    .map((act) => injectRowTokens(act, row, rowId));

  if (visibleActions.length <= MAX_INLINE_ACTIONS) {
    return (
      <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100 group-data-[state=selected]/row:opacity-100">
        {visibleActions.map((action) => (
          <ActionRenderer
            key={action.id}
            action={{ ...action, display: "icon" } as ActionConfig}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end opacity-60 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100 group-data-[state=selected]/row:opacity-100">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal size={16} />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {visibleActions.map((action) => (
            <ActionRenderer
              key={action.id}
              action={{ ...action, display: "menu-item" } as ActionConfig}
            />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
