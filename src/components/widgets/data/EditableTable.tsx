// Stub. Real implementation lands via PROP-0005 (Census aggregate breakdown).
// Once implemented: mirrors DataTable column API with `editable: true` /
// `inputType` per column; manages local row state; commits via a single
// `[Save]` action wired to a whole-object PUT.

import React from "react";

export interface EditableTableProps {
  id?: string;
  dataSource?: unknown;
  columns?: unknown[];
  saveAction?: unknown;
  props?: Record<string, unknown>;
}

export const EditableTable: React.FC<EditableTableProps> = ({ id }) => {
  return (
    <div
      data-widget="editable-table"
      data-widget-id={id}
      className="rounded-md border border-dashed border-muted-foreground/30 p-4 text-sm text-muted-foreground"
    >
      editable-table widget — stub. Implementation pending PROP-0005.
    </div>
  );
};
