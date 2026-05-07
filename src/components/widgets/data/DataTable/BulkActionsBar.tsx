"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ActionRenderer } from "../../controls/ActionRenderer";
import { BulkActionsBarProps } from "./types";
import { ActionConfig } from "@/types/widget";
import { MAX_BULK_ACTIONS } from "./constants";

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
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 animate-fade-in">
          <span className="text-sm font-medium text-foreground tabular-nums">
            {selectedCount} {selectedCount === 1 ? "item" : "items"} selected
          </span>
          <div className="h-4 w-px bg-primary/20" />
          <div className="flex items-center gap-2">
            {bulkActions.slice(0, MAX_BULK_ACTIONS).map((action) => (
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
