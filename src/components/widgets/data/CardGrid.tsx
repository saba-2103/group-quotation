// Stub. Real implementation lands via PROP-0004 (Plans tab card grid).
// Once implemented: iterates `arrayPath` inside the resolved `dataSource`
// payload and renders `cardSchema` per item with `{{item}}` template binding.

import React from "react";

export interface CardGridProps {
  id?: string;
  arrayPath?: string;
  columns?: number | { base?: number; lg?: number };
  cardSchema?: unknown;
  dataSource?: unknown;
  props?: Record<string, unknown>;
}

export const CardGrid: React.FC<CardGridProps> = ({ id }) => {
  return (
    <div
      data-widget="card-grid"
      data-widget-id={id}
      className="rounded-md border border-dashed border-muted-foreground/30 p-4 text-sm text-muted-foreground"
    >
      card-grid widget — stub. Implementation pending PROP-0004.
    </div>
  );
};
