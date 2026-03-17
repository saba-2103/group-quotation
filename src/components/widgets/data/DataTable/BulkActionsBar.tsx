"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ActionRenderer } from "../../controls/ActionRenderer";
import { BulkActionsBarProps } from "./types";
import { ActionConfig } from "@/types/widget";

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  bulkActions,
  hasFilters,
  activeFilterCount,
  onClearSelection,
  onClearAllFilters,
}) => {
  const showBulkBar = selectedCount > 0 && bulkActions.length > 0;
  const showFilterBar = hasFilters && activeFilterCount > 0;

  if (!showBulkBar && !showFilterBar) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {showBulkBar && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium">
            {selectedCount} {selectedCount === 1 ? "item" : "items"} selected
          </span>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            {bulkActions.slice(0, 4).map((action) => (
              <ActionRenderer
                key={action.id}
                action={{ ...action, variant: action.variant ?? "outline" } as ActionConfig}
              />
            ))}
          </div>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            Clear selection
          </Button>
        </div>
      )}

      {showFilterBar && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active
          </span>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onClearAllFilters}>
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
};
