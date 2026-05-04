"use client";

import React from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActionButton } from "../../controls/ActionButton";
import { useActionHandler } from "@/hooks/useActionHandler";
import { MAX_INLINE_ACTIONS } from "./constants";
import { RowActionsProps, RowActionConfig } from "./types";
import { ActionConfig } from "@/types/widget";
import { evaluateCondition } from "@/lib/conditions";

const injectRowId = (action: RowActionConfig, rowId: string): RowActionConfig => {
  const sub = (s: string) => s.replace(/:id\b/g, rowId);
  return {
    ...action,
    ...("target" in action && { target: sub(action.target) }),
    ...("api" in action && action.api && { api: { ...action.api, endpoint: sub(action.api.endpoint) } }),
  } as RowActionConfig;
};

export const RowActions: React.FC<RowActionsProps> = ({
  row,
  rowActions,
  rowIdKey,
}) => {
  const handleAction = useActionHandler();
  const rowId = String(row[rowIdKey] ?? "");

  const visibleActions = rowActions
    .filter((act) => evaluateCondition(act.visible, row))
    .map((act) => injectRowId(act, rowId));

  if (visibleActions.length <= MAX_INLINE_ACTIONS) {
    return (
      <div className="flex items-center justify-end gap-1">
        {visibleActions.map((action) => (
          <ActionButton
            key={action.id}
            action={{ ...action, display: "icon" } as ActionConfig}
            onClick={() => { void handleAction(action, row); }}
          />
        ))}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal size={16} />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {visibleActions.map((action) => (
          <ActionButton
            key={action.id}
            action={{ ...action, display: "menu-item" } as ActionConfig}
            onClick={() => { void handleAction(action, row); }}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
