"use client";

import React, { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useSmartQuery } from "@/hooks/useSmartQuery";
import type { DataSourceConfig } from "@/types/widget";

// DmnDecisionTable — bespoke read-only DMN decision-table renderer.
//
// Reads a stringified JSON blob at `mappingPath` on the entity (default
// `memberToPlanMappingJson`), drills into `decisionTable`, and renders a
// header (hit policy + counts + inputs/outputs chips) followed by the rules
// table. Columns are dynamic: one per input (rendered from `when[input.id]`)
// + one per output (rendered from `then[output.id]`).
//
// Pairs with the `member-mapping-replace-form` modal opened by the host
// action-bar. Editing happens via blob-replace, not inline — see PROP-0007
// and context/ARCH_TRANSITION.md.

interface DmnInput {
  id: string;
  label?: string;
  typeRef?: string;
}

interface DmnOutput {
  id: string;
  label?: string;
  typeRef?: string;
}

interface DmnRule {
  when?: Record<string, unknown>;
  then?: Record<string, unknown>;
}

interface DecisionTable {
  hitPolicy?: string;
  inputs?: DmnInput[];
  outputs?: DmnOutput[];
  rules?: DmnRule[];
}

interface DmnDecisionTableProps {
  id?: string;
  title?: string;
  description?: string;
  mappingPath?: string;
  dataSource?: DataSourceConfig;
  data?: unknown;
  isLoading?: boolean;
  error?: unknown;
}

interface DmnDecisionTableConfigShape {
  id?: string;
  dataSource?: DataSourceConfig;
  props?: DmnDecisionTableProps;
}

function tryParse<T>(v: unknown): T | null {
  if (v == null) return null;
  if (typeof v === "object") return v as T;
  if (typeof v !== "string" || v.length === 0) return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
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

function formatCell(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export const DmnDecisionTable: React.FC<DmnDecisionTableProps & { config?: DmnDecisionTableConfigShape }> = (
  incoming,
) => {
  const flat = incoming as DmnDecisionTableProps;
  const nested = incoming.config?.props;
  const props = { ...nested, ...flat } as DmnDecisionTableProps;
  const {
    title = "Member-to-Plan mapping",
    description,
    mappingPath = "memberToPlanMappingJson",
  } = props;

  const propData = props.data;
  const ownDataSource = incoming.config?.dataSource ?? props.dataSource;
  const {
    data: queryData,
    isLoading: queryLoading,
    error: queryError,
  } = useSmartQuery(propData == null ? ownDataSource : undefined);

  const data = propData ?? queryData;
  const isLoading = props.isLoading ?? queryLoading;
  const error = props.error ?? queryError;

  const decisionTable = useMemo<DecisionTable | null>(() => {
    const raw = getNested(data, mappingPath);
    const outer = tryParse<{ decisionTable?: DecisionTable } | DecisionTable>(raw);
    if (!outer) return null;
    // Accept both wrapped (`{decisionTable: {...}}`) and unwrapped shapes.
    if (typeof outer === "object" && "decisionTable" in outer && outer.decisionTable) {
      return outer.decisionTable;
    }
    return outer as DecisionTable;
  }, [data, mappingPath]);

  if (isLoading) return <LoadingState message="Loading" />;
  if (error) return <ErrorState message="Failed to load mapping" />;

  if (!decisionTable) {
    return (
      <div className="rounded-md border border-dashed border-muted-foreground/30 p-6 text-sm">
        <p className="font-medium text-foreground">No mapping configured</p>
        <p className="mt-1 text-muted-foreground">
          The pricing engine cannot route members until a mapping is set. Use the Replace mapping
          action below to upload a DMN decision table.
        </p>
      </div>
    );
  }

  const inputs = decisionTable.inputs ?? [];
  const outputs = decisionTable.outputs ?? [];
  const rules = decisionTable.rules ?? [];

  return (
    <div className="rounded-lg border border-border/80 bg-card p-4 shadow-sm">
      <div className="mb-3">
        {title && <h3 className="text-base font-semibold">{title}</h3>}
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Hit policy
          </div>
          <div className="font-medium">{decisionTable.hitPolicy ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Rules
          </div>
          <div className="font-medium">{rules.length}</div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Inputs
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {inputs.length > 0 ? (
              inputs.map((i) => (
                <Badge key={i.id} variant="secondary" className="gap-1">
                  <span className="font-mono">{i.id}</span>
                  {i.label && <span>· {i.label}</span>}
                  {i.typeRef && <span className="text-muted-foreground">· {i.typeRef}</span>}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Outputs
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {outputs.length > 0 ? (
              outputs.map((o) => (
                <Badge key={o.id} variant="info" className="gap-1">
                  <span className="font-mono">{o.id}</span>
                  {o.label && <span>· {o.label}</span>}
                  {o.typeRef && <span className="text-muted-foreground">· {o.typeRef}</span>}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </div>

      {rules.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              {inputs.map((i) => (
                <TableHead key={`in-${i.id}`}>
                  <span className="font-mono text-xs">{i.id}</span>
                  {i.label && <span className="ml-1 text-muted-foreground">({i.label})</span>}
                </TableHead>
              ))}
              {outputs.map((o) => (
                <TableHead key={`out-${o.id}`} className="bg-accent/30">
                  <span className="font-mono text-xs">{o.id}</span>
                  {o.label && <span className="ml-1 text-muted-foreground">({o.label})</span>}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium">{idx + 1}</TableCell>
                {inputs.map((i) => (
                  <TableCell key={`in-${idx}-${i.id}`} className="font-mono text-xs">
                    {formatCell(rule.when?.[i.id])}
                  </TableCell>
                ))}
                {outputs.map((o) => (
                  <TableCell
                    key={`out-${idx}-${o.id}`}
                    className="bg-accent/20 font-mono text-xs font-medium"
                  >
                    {formatCell(rule.then?.[o.id])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground">No rules defined.</p>
      )}
    </div>
  );
};
