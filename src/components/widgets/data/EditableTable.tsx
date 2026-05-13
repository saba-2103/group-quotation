"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Save } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useSmartQuery } from "@/hooks/useSmartQuery";
import { useActionHandler } from "@/hooks/useActionHandler";
import { useRole } from "@/hooks/useRole";
import type { DataSourceConfig } from "@/types/widget";

// EditableTable — bespoke join-shaped numeric-edit widget.
//
// Contract: render N rows by joining a "key" array (e.g. `plans`) with a
// "value" array (e.g. `aggregateCensus.planBreakdown`) on a shared field
// (`keyField`); edit one numeric column per row; commit the whole shape
// as a single PUT on Save. See context/ARCH_TRANSITION.md "EditableTable —
// join-shaped numeric edit". Narrow by design; not a replacement for the
// general DataTable.

export type EditableTableBodyShape = "aggregate-census";

interface SaveActionConfig {
  endpoint: string;
  method?: "PUT" | "POST";
  bodyShape: EditableTableBodyShape;
  refreshKey?: string;
  successMessage?: string;
}

interface EmptyState {
  title?: string;
  description?: string;
}

interface EditableTableProps {
  id?: string;
  title?: string;
  description?: string;
  // Join shape
  keyArrayPath: string; // e.g. "plans"
  keyField: string; // e.g. "planNo"
  labelField?: string; // e.g. "planName"
  valueArrayPath: string; // e.g. "aggregateCensus.planBreakdown"
  valueField: string; // e.g. "headcount"
  // Column headers
  keyLabel?: string; // default "Key"
  labelLabel?: string; // default "Name"
  valueLabel?: string; // default "Value"
  // Editing
  inputType?: "number";
  min?: number;
  max?: number;
  step?: number;
  // Save
  saveAction: SaveActionConfig;
  // Display
  showTotal?: boolean;
  totalLabel?: string;
  emptyState?: EmptyState;
  // Gating
  stateField?: string; // default 'status'
  editableStates?: string[]; // default ['DRAFT']
  editableRoles?: Array<"maker" | "checker" | "ops" | "viewer">; // default ['maker']
  // Pre-injected by WidgetRenderer
  dataSource?: DataSourceConfig;
  data?: unknown;
  isLoading?: boolean;
  error?: unknown;
}

interface EditableTableConfigShape {
  id?: string;
  dataSource?: DataSourceConfig;
  props?: EditableTableProps;
}

function getNested(source: unknown, path?: string): unknown {
  if (source == null || !path) return source;
  return path.split(".").reduce<unknown>(
    (acc, key) =>
      acc != null && typeof acc === "object" && key in (acc as object)
        ? (acc as Record<string, unknown>)[key]
        : undefined,
    source,
  );
}

interface JoinedRow {
  key: string;
  label?: string;
  value: number;
}

function buildBody(
  shape: EditableTableBodyShape,
  rows: JoinedRow[],
): Record<string, unknown> {
  switch (shape) {
    case "aggregate-census":
      return {
        headcount: rows.reduce((sum, r) => sum + (Number.isFinite(r.value) ? r.value : 0), 0),
        planBreakdown: rows.map((r) => ({ planNo: r.key, headcount: r.value })),
      };
    default:
      return { rows };
  }
}

function substituteParams(endpoint: string, params: Record<string, string | undefined>): string {
  return endpoint.replace(/:(\w+)|\{\{(\w+)\}\}/g, (match, colon, mustache) => {
    const key = colon ?? mustache;
    const v = params[key];
    return v ?? match;
  });
}

export const EditableTable: React.FC<EditableTableProps & { config?: EditableTableConfigShape }> = (
  incoming,
) => {
  const flat = incoming as EditableTableProps;
  const nested = incoming.config?.props;
  const props: EditableTableProps = {
    ...nested,
    ...flat,
  } as EditableTableProps;

  const {
    title,
    description,
    keyArrayPath,
    keyField,
    labelField,
    valueArrayPath,
    valueField,
    keyLabel = "Key",
    labelLabel = "Name",
    valueLabel = "Value",
    min = 0,
    step = 1,
    saveAction,
    showTotal = true,
    totalLabel = "Total",
    emptyState,
    stateField = "status",
    editableStates = ["DRAFT"],
    editableRoles = ["maker"],
    dataSource: propDataSource,
  } = props;

  const { role } = useRole();
  const params = useParams<{ id?: string }>();
  const dispatch = useActionHandler();

  const propData = props.data;
  const ownDataSource = incoming.config?.dataSource ?? propDataSource;
  const {
    data: queryData,
    isLoading: queryLoading,
    error: queryError,
  } = useSmartQuery(propData == null ? ownDataSource : undefined);

  const data = propData ?? queryData;
  const isLoading = props.isLoading ?? queryLoading;
  const error = props.error ?? queryError;

  const keyRows = useMemo<Record<string, unknown>[]>(() => {
    const arr = getNested(data, keyArrayPath);
    return Array.isArray(arr) ? (arr as Record<string, unknown>[]) : [];
  }, [data, keyArrayPath]);

  const valueRows = useMemo<Record<string, unknown>[]>(() => {
    const arr = getNested(data, valueArrayPath);
    return Array.isArray(arr) ? (arr as Record<string, unknown>[]) : [];
  }, [data, valueArrayPath]);

  const serverRows = useMemo<JoinedRow[]>(() => {
    const byKey = new Map<string, number>();
    valueRows.forEach((row) => {
      const k = row[keyField];
      const v = row[valueField];
      if (k != null) byKey.set(String(k), Number(v) || 0);
    });
    return keyRows.map((kr) => {
      const k = String(kr[keyField] ?? "");
      return {
        key: k,
        label: labelField ? (kr[labelField] as string | undefined) : undefined,
        value: byKey.get(k) ?? 0,
      };
    });
  }, [keyRows, valueRows, keyField, valueField, labelField]);

  // Local edit state seeded from serverRows; re-seed when the server snapshot
  // changes (after Save → refresh).
  const [rows, setRows] = useState<JoinedRow[]>(serverRows);
  useEffect(() => {
    setRows(serverRows);
  }, [serverRows]);

  const currentState = data && typeof data === "object" ? String((data as Record<string, unknown>)[stateField] ?? "") : "";
  const stateAllowsEdit = editableStates.includes(currentState);
  const roleAllowsEdit = editableRoles.includes(role);
  const canEdit = stateAllowsEdit && roleAllowsEdit;

  const isDirty = useMemo(() => {
    if (rows.length !== serverRows.length) return true;
    return rows.some((r, i) => r.value !== serverRows[i]?.value);
  }, [rows, serverRows]);

  const allValid = rows.every(
    (r) => Number.isInteger(r.value) && r.value >= min && (props.max == null || r.value <= props.max),
  );
  const total = rows.reduce((sum, r) => sum + (Number.isFinite(r.value) ? r.value : 0), 0);

  const setRowValue = (idx: number, raw: string) => {
    const n = raw === "" ? 0 : Number(raw);
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, value: Number.isFinite(n) ? n : 0 } : r)));
  };

  const onSave = async () => {
    const quoteId = params?.id;
    const endpoint = substituteParams(saveAction.endpoint, { id: quoteId });
    const body = buildBody(saveAction.bodyShape, rows);
    await dispatch({
      id: incoming.config?.id ?? "editable-table-save",
      type: "api-mutation",
      api: { endpoint, method: saveAction.method ?? "PUT", body },
      refreshKey: saveAction.refreshKey ? substituteParams(saveAction.refreshKey, { id: quoteId }) : undefined,
      successMessage: saveAction.successMessage ?? "Saved",
    });
  };

  if (isLoading) return <LoadingState message="Loading" />;
  if (error) return <ErrorState message="Failed to load" />;

  if (keyRows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-muted-foreground/30 p-6 text-sm">
        <p className="font-medium text-foreground">{emptyState?.title ?? "No rows"}</p>
        {emptyState?.description && (
          <p className="mt-1 text-muted-foreground">{emptyState.description}</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/80 bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          {title && <h3 className="text-base font-semibold">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {canEdit && (
          <Button onClick={onSave} disabled={!isDirty || !allValid} size="sm">
            <Save className="mr-1 h-3.5 w-3.5" />
            Save changes
          </Button>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-32">{keyLabel}</TableHead>
            {labelField && <TableHead>{labelLabel}</TableHead>}
            <TableHead className="w-40 text-right">{valueLabel}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, idx) => (
            <TableRow key={r.key}>
              <TableCell className="font-medium">{r.key}</TableCell>
              {labelField && <TableCell>{r.label ?? "—"}</TableCell>}
              <TableCell className="text-right">
                {canEdit ? (
                  <Input
                    type="number"
                    min={min}
                    step={step}
                    max={props.max}
                    value={String(r.value)}
                    onChange={(e) => setRowValue(idx, e.target.value)}
                    className="ml-auto w-28 text-right"
                  />
                ) : (
                  <span>{r.value}</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        {showTotal && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={labelField ? 2 : 1} className="text-right font-semibold">
                {totalLabel}
              </TableCell>
              <TableCell className="text-right font-semibold">{total}</TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
      {canEdit && !allValid && (
        <p className="mt-2 text-xs text-destructive">
          All values must be non-negative integers
          {props.max != null ? ` ≤ ${props.max}` : ""}.
        </p>
      )}
    </div>
  );
};
