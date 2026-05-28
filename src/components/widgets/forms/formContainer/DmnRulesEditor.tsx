"use client";

import React, { useMemo, useState } from "react";
import { Plus, Trash2, Code, Table as TableIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SelectOption } from "./types";

// Row-per-rule editor for the member-to-plan DMN mapping. Surfaces the
// common case (one condition column → one plan output) as an editable
// table; falls back to a raw-JSON textarea via the escape-hatch toggle
// for anything the table can't express (multi-input rules, custom
// hit policies that the host doesn't model, etc.).
//
// The on-the-wire shape is canonical DMN — the same `decisionTable`
// envelope the read-only DmnDecisionTable renders. We always serialize
// to that shape so a quote edited via the table can still be inspected
// in the read-only view, and vice-versa.

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

interface DmnRulesEditorProps {
  value: string;
  onChange: (next: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  plans?: SelectOption[];
  placeholder?: string;
}

const HIT_POLICIES = ["FIRST", "UNIQUE", "ANY", "PRIORITY", "COLLECT"] as const;

const DEFAULT_INPUT_ID = "criteria";
const DEFAULT_OUTPUT_ID = "planNo";

function makeDefault(): DecisionTable {
  return {
    hitPolicy: "FIRST",
    inputs: [
      { id: DEFAULT_INPUT_ID, label: "Member criteria", typeRef: "string" },
    ],
    outputs: [{ id: DEFAULT_OUTPUT_ID, label: "Plan", typeRef: "string" }],
    rules: [],
  };
}

function tryParse(raw: string): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Accept both wrapped (`{decisionTable: {...}}`) and unwrapped shapes,
// and migrate the legacy `{hits, rules:[{if, then:"PLAN"}]}` mock format
// to canonical DMN on read. Returns null when we can't make sense of it
// (caller decides whether to seed a default or surface an error).
function normalize(parsed: unknown): DecisionTable | null {
  if (parsed == null || typeof parsed !== "object") return null;

  const wrapped = (parsed as { decisionTable?: unknown }).decisionTable;
  const table = (wrapped && typeof wrapped === "object" ? wrapped : parsed) as Record<string, unknown>;

  const inputs = Array.isArray(table.inputs) ? (table.inputs as DmnInput[]) : undefined;
  const outputs = Array.isArray(table.outputs) ? (table.outputs as DmnOutput[]) : undefined;
  const rawRules = Array.isArray(table.rules) ? table.rules : [];

  if (inputs && outputs) {
    // Canonical DMN already.
    return {
      hitPolicy: typeof table.hitPolicy === "string" ? table.hitPolicy : "FIRST",
      inputs,
      outputs,
      rules: rawRules as DmnRule[],
    };
  }

  // Legacy mock shape: {hits, rules:[{if:"<expr>", then:"<planNo>"}]}
  const legacyHit =
    typeof table.hits === "string"
      ? table.hits.toUpperCase()
      : typeof table.hitPolicy === "string"
        ? table.hitPolicy
        : "FIRST";
  const migrated: DmnRule[] = rawRules.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      when: { [DEFAULT_INPUT_ID]: row.if ?? row.when ?? "" },
      then: { [DEFAULT_OUTPUT_ID]: row.then ?? "" },
    };
  });
  return {
    hitPolicy: legacyHit,
    inputs: [
      { id: DEFAULT_INPUT_ID, label: "Member criteria", typeRef: "string" },
    ],
    outputs: [{ id: DEFAULT_OUTPUT_ID, label: "Plan", typeRef: "string" }],
    rules: migrated,
  };
}

function serialize(table: DecisionTable): string {
  return JSON.stringify({ decisionTable: table });
}

function planLabel(planNo: string, plans: SelectOption[] | undefined): string {
  const hit = plans?.find((p) => p.value === planNo);
  return hit?.label ?? planNo;
}

export const DmnRulesEditor: React.FC<DmnRulesEditorProps> = ({
  value,
  onChange,
  onBlur,
  disabled,
  plans,
  placeholder,
}) => {
  const [mode, setMode] = useState<"table" | "json">("table");
  const [rawDraft, setRawDraft] = useState<string>(value ?? "");

  const table = useMemo<DecisionTable>(() => {
    const parsed = tryParse(value);
    return normalize(parsed) ?? makeDefault();
  }, [value]);

  const inputs = table.inputs ?? [];
  const outputs = table.outputs ?? [];
  const rules = table.rules ?? [];

  const update = (next: DecisionTable) => {
    onChange(serialize(next));
  };

  const setHitPolicy = (hp: string) => update({ ...table, hitPolicy: hp });

  const addRule = () => {
    const blankWhen: Record<string, unknown> = {};
    inputs.forEach((i) => {
      blankWhen[i.id] = "";
    });
    const blankThen: Record<string, unknown> = {};
    outputs.forEach((o) => {
      blankThen[o.id] = "";
    });
    update({ ...table, rules: [...rules, { when: blankWhen, then: blankThen }] });
  };

  const removeRule = (idx: number) => {
    update({ ...table, rules: rules.filter((_, i) => i !== idx) });
  };

  const setRuleInput = (idx: number, inputId: string, v: string) => {
    const nextRules = rules.map((r, i) =>
      i === idx ? { ...r, when: { ...(r.when ?? {}), [inputId]: v } } : r,
    );
    update({ ...table, rules: nextRules });
  };

  const setRuleOutput = (idx: number, outputId: string, v: string) => {
    const nextRules = rules.map((r, i) =>
      i === idx ? { ...r, then: { ...(r.then ?? {}), [outputId]: v } } : r,
    );
    update({ ...table, rules: nextRules });
  };

  const switchToJson = () => {
    setRawDraft(value || serialize(table));
    setMode("json");
  };

  const switchToTable = () => {
    // Try to commit the raw draft; if it parses, push it through onChange
    // so the table picks it up. If it doesn't, keep the previous value and
    // bail out — user has to fix or cancel.
    if (rawDraft && rawDraft !== value) {
      try {
        JSON.parse(rawDraft);
        onChange(rawDraft);
      } catch {
        // leave value as-is; the textarea retains the draft for editing
        return;
      }
    }
    setMode("table");
  };

  if (mode === "json") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Raw DMN JSON — used for shapes the table editor can&apos;t express
            (multi-input rules, custom output columns).
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={switchToTable}
            disabled={disabled}
          >
            <TableIcon className="mr-1.5 size-3.5" />
            Back to table
          </Button>
        </div>
        <Textarea
          value={rawDraft}
          onChange={(e) => setRawDraft(e.target.value)}
          onBlur={() => {
            // Commit on blur so form validation sees the latest text
            if (rawDraft !== value) onChange(rawDraft);
            onBlur?.();
          }}
          disabled={disabled}
          placeholder={placeholder}
          className="min-h-48 font-mono text-xs"
          spellCheck={false}
        />
      </div>
    );
  }

  const planOptions = plans ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Hit policy
          </label>
          <Select
            value={table.hitPolicy ?? "FIRST"}
            onValueChange={setHitPolicy}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HIT_POLICIES.map((hp) => (
                <SelectItem key={hp} value={hp}>
                  {hp}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {rules.length} {rules.length === 1 ? "rule" : "rules"}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={switchToJson}
          disabled={disabled}
        >
          <Code className="mr-1.5 size-3.5" />
          Edit raw JSON
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border border-border/80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              {inputs.map((i) => (
                <TableHead key={`hin-${i.id}`}>
                  {i.label ?? i.id}
                  <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                    ({i.id})
                  </span>
                </TableHead>
              ))}
              {outputs.map((o) => (
                <TableHead key={`hout-${o.id}`} className="bg-accent/30">
                  {o.label ?? o.id}
                  {o.id !== DEFAULT_OUTPUT_ID && (
                    <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                      ({o.id})
                    </span>
                  )}
                </TableHead>
              ))}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={inputs.length + outputs.length + 2}
                  className="text-center text-sm text-muted-foreground"
                >
                  No rules yet. Add a row to start mapping members to plans.
                </TableCell>
              </TableRow>
            ) : (
              rules.map((rule, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{idx + 1}</TableCell>
                  {inputs.map((i) => (
                    <TableCell key={`bin-${idx}-${i.id}`}>
                      <Input
                        value={String(rule.when?.[i.id] ?? "")}
                        onChange={(e) => setRuleInput(idx, i.id, e.target.value)}
                        disabled={disabled}
                        placeholder='e.g. salary > 1500000 or "true"'
                        className="h-8 font-mono text-xs"
                      />
                    </TableCell>
                  ))}
                  {outputs.map((o) => {
                    const cur = String(rule.then?.[o.id] ?? "");
                    const isPlanCol = o.id === DEFAULT_OUTPUT_ID && planOptions.length > 0;
                    return (
                      <TableCell key={`bout-${idx}-${o.id}`} className="bg-accent/10">
                        {isPlanCol ? (
                          <Select
                            value={cur}
                            onValueChange={(v) => setRuleOutput(idx, o.id, v)}
                            disabled={disabled}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Select plan">
                                {cur ? planLabel(cur, planOptions) : undefined}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {planOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={cur}
                            onChange={(e) => setRuleOutput(idx, o.id, e.target.value)}
                            disabled={disabled}
                            className="h-8 font-mono text-xs"
                          />
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRule(idx)}
                      disabled={disabled}
                      aria-label={`Remove rule ${idx + 1}`}
                      className="size-7"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRule}
          disabled={disabled}
        >
          <Plus className="mr-1.5 size-3.5" />
          Add rule
        </Button>
        {planOptions.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No plans on this quote yet — add plans first, then map members to them.
          </p>
        )}
      </div>
    </div>
  );
};
