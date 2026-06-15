'use client';

/**
 * ConfigurableRuleBuilder
 *
 * Reusable builder for ConfigurableRule.spec.
 * Used in Step 3 (SI), Step 4 (FCL/NML), Step 5 (Rate Card, mapping).
 */

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type {
  ConfigurableRuleSpec,
  ConfigurableRuleType,
  FixedRuleSpec,
  FormulaRuleSpec,
  GridRuleSpec,
  LookupColumnRuleSpec,
} from '@/types/group-pas/quotation-v2';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ConfigurableRuleValue {
  ruleType: ConfigurableRuleType;
  spec: ConfigurableRuleSpec;
}

interface Props {
  value: ConfigurableRuleValue;
  onChange: (v: ConfigurableRuleValue) => void;
  readOnly?: boolean;
  /** Default type to pre-select (e.g. GRID for rate card) */
  defaultType?: ConfigurableRuleType;
  label?: string;
  hint?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Type tabs
// ─────────────────────────────────────────────────────────────────────────────

const RULE_TYPES: { value: ConfigurableRuleType; label: string }[] = [
  { value: 'FIXED', label: 'Fixed' },
  { value: 'LOOKUP_COLUMN', label: 'Lookup' },
  { value: 'FORMULA', label: 'Formula' },
  { value: 'GRID', label: 'Grid' },
];

function defaultSpec(type: ConfigurableRuleType): ConfigurableRuleSpec {
  switch (type) {
    case 'FIXED':
      return { type: 'FIXED', value: 0 };
    case 'LOOKUP_COLUMN':
      return { type: 'LOOKUP_COLUMN', tableId: '', columnKey: '', lookupKey: '' };
    case 'FORMULA':
      return { type: 'FORMULA', expression: '', variables: [] };
    case 'GRID':
      return { type: 'GRID', tableId: '', rowKey: 'AGE_BAND', columnKey: 'GENDER' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Grid editor
// ─────────────────────────────────────────────────────────────────────────────

type GridRow = { rowKey: string; columnKey: string; value: string };

const STARTER_GRID: GridRow[] = [
  { rowKey: '18-25', columnKey: 'M', value: '1.2' },
  { rowKey: '18-25', columnKey: 'F', value: '1.1' },
  { rowKey: '26-35', columnKey: 'M', value: '1.5' },
  { rowKey: '26-35', columnKey: 'F', value: '1.3' },
  { rowKey: '36-45', columnKey: 'M', value: '2.2' },
  { rowKey: '36-45', columnKey: 'F', value: '1.9' },
  { rowKey: '46-55', columnKey: 'M', value: '3.8' },
  { rowKey: '46-55', columnKey: 'F', value: '3.1' },
];

function GridEditor({
  spec,
  onChange,
  readOnly,
}: {
  spec: GridRuleSpec;
  onChange: (s: GridRuleSpec) => void;
  readOnly?: boolean;
}) {
  const [rows, setRows] = useState<GridRow[]>(STARTER_GRID);

  function updateRow(i: number, field: keyof GridRow, val: string) {
    const next = rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r));
    setRows(next);
  }

  function addRow() {
    setRows([...rows, { rowKey: '', columnKey: '', value: '' }]);
  }

  function removeRow(i: number) {
    setRows(rows.filter((_, idx) => idx !== i));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1 text-xs">Row key (e.g. AGE_BAND)</Label>
          <Input
            value={spec.rowKey}
            readOnly={readOnly}
            onChange={(e) => onChange({ ...spec, rowKey: e.target.value })}
            placeholder="AGE_BAND"
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="mb-1 text-xs">Column key (e.g. GENDER)</Label>
          <Input
            value={spec.columnKey}
            readOnly={readOnly}
            onChange={(e) => onChange({ ...spec, columnKey: e.target.value })}
            placeholder="GENDER"
            className="h-8 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-xs">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                {spec.rowKey || 'Row'}
              </th>
              <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                {spec.columnKey || 'Column'}
              </th>
              <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                Rate / 1000
              </th>
              {!readOnly && <th className="w-8" />}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, i) => (
              <tr key={i} className="bg-background">
                <td className="px-2 py-1">
                  <Input
                    value={row.rowKey}
                    readOnly={readOnly}
                    onChange={(e) => updateRow(i, 'rowKey', e.target.value)}
                    className="h-6 text-xs"
                  />
                </td>
                <td className="px-2 py-1">
                  <Input
                    value={row.columnKey}
                    readOnly={readOnly}
                    onChange={(e) => updateRow(i, 'columnKey', e.target.value)}
                    className="h-6 text-xs"
                  />
                </td>
                <td className="px-2 py-1">
                  <Input
                    value={row.value}
                    readOnly={readOnly}
                    onChange={(e) => updateRow(i, 'value', e.target.value)}
                    className="h-6 text-xs"
                  />
                </td>
                {!readOnly && (
                  <td className="px-1 py-1">
                    <button
                      onClick={() => removeRow(i)}
                      className="rounded p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <Button type="button" variant="outline" size="xs" className="self-start" onClick={addRow}>
          <Plus className="mr-1 size-3" />
          Add row
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lookup editor
// ─────────────────────────────────────────────────────────────────────────────

function LookupEditor({
  spec,
  onChange,
  readOnly,
}: {
  spec: LookupColumnRuleSpec;
  onChange: (s: LookupColumnRuleSpec) => void;
  readOnly?: boolean;
}) {
  const [pairs, setPairs] = useState<{ k: string; v: string }[]>([{ k: '', v: '' }]);

  function updatePair(i: number, field: 'k' | 'v', val: string) {
    setPairs(pairs.map((p, idx) => (idx === i ? { ...p, [field]: val } : p)));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="mb-1 text-xs">Table ID</Label>
          <Input
            value={spec.tableId}
            readOnly={readOnly}
            onChange={(e) => onChange({ ...spec, tableId: e.target.value })}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="mb-1 text-xs">Column Key</Label>
          <Input
            value={spec.columnKey}
            readOnly={readOnly}
            onChange={(e) => onChange({ ...spec, columnKey: e.target.value })}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="mb-1 text-xs">Lookup Key</Label>
          <Input
            value={spec.lookupKey}
            readOnly={readOnly}
            onChange={(e) => onChange({ ...spec, lookupKey: e.target.value })}
            className="h-8 text-xs"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Key → Value pairs</Label>
        {pairs.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={p.k}
              placeholder="key"
              readOnly={readOnly}
              onChange={(e) => updatePair(i, 'k', e.target.value)}
              className="h-7 text-xs"
            />
            <span className="text-xs text-muted-foreground">→</span>
            <Input
              value={p.v}
              placeholder="value"
              readOnly={readOnly}
              onChange={(e) => updatePair(i, 'v', e.target.value)}
              className="h-7 text-xs"
            />
            {!readOnly && (
              <button
                onClick={() => setPairs(pairs.filter((_, idx) => idx !== i))}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3" />
              </button>
            )}
          </div>
        ))}
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="mt-1 self-start"
            onClick={() => setPairs([...pairs, { k: '', v: '' }])}
          >
            <Plus className="mr-1 size-3" />
            Add pair
          </Button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function ConfigurableRuleBuilder({ value, onChange, readOnly, label, hint }: Props) {
  const { ruleType, spec } = value;

  function setType(t: ConfigurableRuleType) {
    onChange({ ruleType: t, spec: defaultSpec(t) });
  }

  function updateSpec(s: ConfigurableRuleSpec) {
    onChange({ ...value, spec: s });
  }

  return (
    <div className="flex flex-col gap-3">
      {label && (
        <div>
          <p className="text-sm font-medium">{label}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      )}

      {/* Type selector */}
      {!readOnly && (
        <div className="flex gap-1 rounded-md border p-1 w-fit">
          {RULE_TYPES.map((rt) => (
            <button
              key={rt.value}
              onClick={() => setType(rt.value)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                ruleType === rt.value
                  ? 'bg-indigo-600 text-white'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {rt.label}
            </button>
          ))}
        </div>
      )}
      {readOnly && (
        <span className="inline-flex rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {ruleType}
        </span>
      )}

      {/* Spec editor */}
      {ruleType === 'FIXED' && (
        <div>
          <Label className="mb-1 text-xs">Value</Label>
          <Input
            type="number"
            readOnly={readOnly}
            value={String((spec as FixedRuleSpec).value)}
            onChange={(e) => updateSpec({ type: 'FIXED', value: Number(e.target.value) })}
            className="h-8 w-48 text-xs"
          />
        </div>
      )}

      {ruleType === 'LOOKUP_COLUMN' && (
        <LookupEditor
          spec={spec as LookupColumnRuleSpec}
          onChange={(s) => updateSpec(s)}
          readOnly={readOnly}
        />
      )}

      {ruleType === 'FORMULA' && (
        <div className="flex flex-col gap-2">
          <div>
            <Label className="mb-1 text-xs">Expression</Label>
            <Textarea
              readOnly={readOnly}
              value={(spec as FormulaRuleSpec).expression}
              onChange={(e) =>
                updateSpec({
                  ...(spec as FormulaRuleSpec),
                  expression: e.target.value,
                })
              }
              rows={3}
              placeholder="e.g. age * 0.002 * sum_insured"
              className="font-mono text-xs"
            />
          </div>
          <div>
            <Label className="mb-1 text-xs">Variables (comma-separated)</Label>
            <Input
              readOnly={readOnly}
              value={(spec as FormulaRuleSpec).variables.join(', ')}
              onChange={(e) =>
                updateSpec({
                  ...(spec as FormulaRuleSpec),
                  variables: e.target.value.split(',').map((v) => v.trim()).filter(Boolean),
                })
              }
              placeholder="age, sum_insured, gender"
              className="h-8 text-xs"
            />
          </div>
        </div>
      )}

      {ruleType === 'GRID' && (
        <GridEditor
          spec={spec as GridRuleSpec}
          onChange={(s) => updateSpec(s)}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}
