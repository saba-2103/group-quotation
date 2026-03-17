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
import { RowActionsProps, RowActionConfig } from "./types";
import { ActionConfig } from "@/types/widget";

export const RowActions: React.FC<RowActionsProps> = ({
  row,
  rowActions,
}) => {
  const rowId = (row.id ?? row.quotationNumber) as string;

  const mappedActions: RowActionConfig[] = rowActions.map((act) => {
    const a = { ...act };
    if (a.actionProps?.route) {
      a.actionProps = { ...a.actionProps, route: a.actionProps.route.replace(":id", rowId) };
    }
    if (a.actionProps?.api?.endpoint) {
      a.actionProps = {
        ...a.actionProps,
        api: { ...a.actionProps.api, endpoint: a.actionProps.api.endpoint.replace(":id", rowId) },
      };
    }
    return a;
  });

  if (mappedActions.length <= MAX_INLINE_ACTIONS) {
    return (
      <div className="flex items-center justify-end gap-1">
        {mappedActions.map((action) => (
          <ActionRenderer key={action.id} action={{ ...action, display: "icon" } as ActionConfig} />
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
        {mappedActions.map((action) => (
          <ActionRenderer key={action.id} action={{ ...action, display: "menu-item" } as ActionConfig} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
