"use client";
import React from "react";
import { cn } from "@/lib/utils";

interface CompareField {
  label: string;
  before?: string | number | null;
  after?: string | number | null;
}

interface ComparePanelConfig {
  title?: string;
  fields?: CompareField[];
  beforeLabel?: string;
  afterLabel?: string;
}

export const ComparePanel: React.FC<ComparePanelConfig> = ({
  title = "Changes",
  fields = [],
  beforeLabel = "Before",
  afterLabel = "After",
}) => {
  const changedFields = fields.filter((f) => String(f.before ?? "") !== String(f.after ?? ""));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">{title}</h3>
        <span className="text-xs text-muted-foreground">{changedFields.length} change{changedFields.length !== 1 ? "s" : ""}</span>
      </div>
      {changedFields.length === 0 ? (
        <p className="text-sm text-muted-foreground">No changes detected.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Field</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">{beforeLabel}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">{afterLabel}</th>
              </tr>
            </thead>
            <tbody>
              {changedFields.map((field, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-2 font-medium text-muted-foreground">{field.label}</td>
                  <td className="px-4 py-2">
                    <span className={cn("rounded px-1.5 py-0.5 text-xs", field.before != null ? "bg-red-50 text-red-700 line-through" : "text-muted-foreground")}>
                      {field.before ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={cn("rounded px-1.5 py-0.5 text-xs", field.after != null ? "bg-green-50 text-green-700 font-medium" : "text-muted-foreground")}>
                      {field.after ?? "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
