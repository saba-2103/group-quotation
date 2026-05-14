"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionHandler } from "@/hooks/useActionHandler";
import { useOverlayStore } from "@/hooks/useOverlayStore";
import {
  CENSUS_COLUMN_SUPERSET,
  buildSchemaJson,
  parseSchemaJson,
  type FrictionlessField,
} from "@/lib/group-pas/censusColumns";

// CensusFileFormatForm — bespoke editor for the Quote's `CensusFileFormat`
// (docs/spec/quotation/QuotationData.data). Replaces a raw-JSON textarea with
// a column picker driven by the backend's known superset
// (src/lib/group-pas/censusColumns.ts) so the broker selects from a menu
// instead of hand-writing Frictionless Table Schema.

const FORM_OVERLAY_ID = "census-file-format-form";

type FileType = "CSV" | "XLSX";

interface OverlayPayload {
  _mode?: "edit" | "add";
  id?: string;
  quoteId?: string;
  censusFileFormatJson?: unknown;
  censusFileFormat?: unknown;
}

function parseCensusFileFormat(
  payload: OverlayPayload | undefined,
): {
  fileType: FileType;
  sheetName: string;
  schemaJson: string;
  dialectJson: string;
} {
  const empty = {
    fileType: "CSV" as FileType,
    sheetName: "",
    schemaJson: "",
    dialectJson: "",
  };
  if (!payload) return empty;
  const blob: unknown =
    payload.censusFileFormat ??
    (typeof payload.censusFileFormatJson === "string"
      ? safeJsonParse(payload.censusFileFormatJson)
      : payload.censusFileFormatJson);
  if (!blob || typeof blob !== "object") return empty;
  const f = blob as {
    fileType?: string;
    sheetName?: string;
    schemaJson?: string;
    dialectJson?: string;
  };
  return {
    fileType: (f.fileType as FileType) ?? "CSV",
    sheetName: f.sheetName ?? "",
    schemaJson: f.schemaJson ?? "",
    dialectJson: f.dialectJson ?? "",
  };
}

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export const CensusFileFormatForm: React.FC = () => {
  const params = useParams<{ id?: string }>();
  const dispatch = useActionHandler();
  const closeOverlay = useOverlayStore((s) => s.close);
  const overlayPayload = useOverlayStore(
    (s) => s.openOverlays[FORM_OVERLAY_ID]?.data as OverlayPayload | undefined,
  );

  const quoteId = overlayPayload?.quoteId ?? overlayPayload?.id ?? params?.id;

  const initial = useMemo(() => parseCensusFileFormat(overlayPayload), [overlayPayload]);
  const initialParsed = useMemo(() => parseSchemaJson(initial.schemaJson), [initial.schemaJson]);

  const [fileType, setFileType] = useState<FileType>(initial.fileType);
  const [sheetName, setSheetName] = useState(initial.sheetName);
  const [selected, setSelected] = useState<Set<string>>(() => {
    // Seed with the parsed schema, falling back to "required columns only"
    // on a fresh quote so the broker starts with a valid minimum.
    if (initialParsed.selected.size > 0) return new Set(initialParsed.selected);
    return new Set(
      CENSUS_COLUMN_SUPERSET.filter((c) => c.required).map((c) => c.name),
    );
  });
  const [unknownFields, setUnknownFields] = useState<FrictionlessField[]>(
    initialParsed.unknown,
  );
  const [dialectJson, setDialectJson] = useState(initial.dialectJson);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [rawSchemaJson, setRawSchemaJson] = useState(initial.schemaJson);
  const [rawError, setRawError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Rebuild state when the overlay payload changes.
  useEffect(() => {
    const next = parseCensusFileFormat(overlayPayload);
    const parsed = parseSchemaJson(next.schemaJson);
    setFileType(next.fileType);
    setSheetName(next.sheetName);
    setSelected(
      parsed.selected.size > 0
        ? new Set(parsed.selected)
        : new Set(
            CENSUS_COLUMN_SUPERSET.filter((c) => c.required).map((c) => c.name),
          ),
    );
    setUnknownFields(parsed.unknown);
    setDialectJson(next.dialectJson);
    setRawSchemaJson(next.schemaJson);
    setRawError(null);
    setAdvancedOpen(false);
  }, [overlayPayload]);

  const toggle = (name: string) => {
    const col = CENSUS_COLUMN_SUPERSET.find((c) => c.name === name);
    if (!col || col.required) return; // required columns are always on
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const removeUnknown = (name: string) =>
    setUnknownFields((prev) => prev.filter((f) => f.name !== name));

  const errors = useMemo(() => {
    const errs: { schemaJson?: string; dialectJson?: string; sheetName?: string } = {};
    if (selected.size === 0) errs.schemaJson = "At least one column must be selected";
    if (fileType === "XLSX" && !sheetName.trim()) errs.sheetName = "Sheet name is required for XLSX";
    if (dialectJson.trim()) {
      try {
        JSON.parse(dialectJson);
      } catch {
        errs.dialectJson = "Dialect must be valid JSON";
      }
    }
    return errs;
  }, [fileType, sheetName, selected, dialectJson]);
  const isValid = Object.keys(errors).length === 0;

  const composeSchemaJson = (): string => {
    const base = buildSchemaJson(selected);
    if (unknownFields.length === 0) return base;
    // Re-merge unknown fields the user kept so we don't drop them on save.
    const parsed = JSON.parse(base) as { fields: FrictionlessField[] };
    parsed.fields.push(...unknownFields);
    return JSON.stringify(parsed);
  };

  const applyRawSchema = () => {
    try {
      JSON.parse(rawSchemaJson);
      const parsed = parseSchemaJson(rawSchemaJson);
      setSelected(parsed.selected);
      setUnknownFields(parsed.unknown);
      setRawError(null);
    } catch (e) {
      setRawError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  const onSubmit = async () => {
    if (!isValid || !quoteId) return;
    setSubmitting(true);
    try {
      const body = {
        fileType,
        sheetName: fileType === "XLSX" ? sheetName : undefined,
        schemaJson: composeSchemaJson(),
        dialectJson: dialectJson.trim() ? dialectJson : undefined,
      };
      await dispatch({
        id: "submit-edit-census-file-format",
        type: "api-mutation",
        api: {
          endpoint: `/api/quotation/quotes/${quoteId}/census-file-format`,
          method: "PUT",
          body,
        },
        refreshKey: `/api/quotation/quotes/${quoteId}`,
        successMessage: "Census file format saved",
        onSuccess: [{ type: "trigger-event", target: FORM_OVERLAY_ID }],
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Edit census file format</h2>
        <p className="text-sm text-muted-foreground">
          Pick the columns your census file will have. The backend uses this to
          parse member rows on upload. Required columns are always included.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="cff-file-type">File type</Label>
          <Select
            value={fileType}
            onValueChange={(v) => setFileType(v as FileType)}
          >
            <SelectTrigger id="cff-file-type" data-testid="file-type-trigger">
              <SelectValue placeholder="Select file type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CSV">CSV</SelectItem>
              <SelectItem value="XLSX">Excel (XLSX)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {fileType === "XLSX" && (
          <div>
            <Label htmlFor="cff-sheet-name">Sheet name</Label>
            <Input
              id="cff-sheet-name"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="Members"
            />
            {errors.sheetName && (
              <p className="mt-1 text-xs text-destructive">{errors.sheetName}</p>
            )}
          </div>
        )}
      </div>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Columns</h3>
          <span className="text-xs text-muted-foreground">
            {selected.size + unknownFields.length} selected
          </span>
        </div>
        {errors.schemaJson && (
          <p className="mb-2 text-xs text-destructive">{errors.schemaJson}</p>
        )}
        <div className="space-y-1.5">
          {CENSUS_COLUMN_SUPERSET.map((col) => {
            const checked = col.required || selected.has(col.name);
            return (
              <label
                key={col.name}
                data-testid={`census-column-${col.name}`}
                className="flex cursor-pointer items-start gap-3 rounded border border-border/60 p-2.5 hover:bg-muted/40"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4"
                  checked={checked}
                  disabled={col.required}
                  onChange={() => toggle(col.name)}
                  aria-label={`Toggle ${col.name}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs">{col.name}</span>
                    <span className="text-xs text-muted-foreground">— {col.label}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {col.type}
                    </Badge>
                    {col.required && (
                      <Badge variant="outline" className="text-[10px]">
                        Required
                      </Badge>
                    )}
                    {col.formulaAttribute && (
                      <Badge variant="secondary" className="text-[10px]">
                        Formula attribute
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {col.description}
                  </p>
                </div>
              </label>
            );
          })}
        </div>

        {unknownFields.length > 0 && (
          <div className="mt-3 rounded border border-warning/40 bg-warning/10 p-2 text-xs">
            <div className="mb-1 font-medium">
              Custom columns kept from raw JSON ({unknownFields.length})
            </div>
            <p className="mb-2 text-muted-foreground">
              These aren&apos;t in the catalog superset. They&apos;ll be preserved on
              save — remove any you don&apos;t want.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {unknownFields.map((f) => (
                <Badge
                  key={f.name}
                  variant="outline"
                  className="gap-1 font-normal"
                >
                  <span className="font-mono text-[10px]">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => removeUnknown(f.name)}
                    aria-label={`Remove custom column ${f.name}`}
                    className="ml-1 text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </section>

      <section>
        <Label htmlFor="cff-dialect">Dialect (optional JSON)</Label>
        <textarea
          id="cff-dialect"
          value={dialectJson}
          onChange={(e) => setDialectJson(e.target.value)}
          className="mt-1 h-20 w-full rounded border border-border/60 p-2 font-mono text-xs"
          placeholder='{"delimiter":",","quote":"\"","hasHeader":true}'
        />
        <p className="mt-1 text-xs text-muted-foreground">
          CSV/XLSX dialect — delimiter, quote char, header presence, encoding.
          Leave blank for defaults.
        </p>
        {errors.dialectJson && (
          <p className="mt-1 text-xs text-destructive">{errors.dialectJson}</p>
        )}
      </section>

      <details
        className="rounded border border-border/60"
        open={advancedOpen}
        onToggle={(e) => setAdvancedOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
          <ChevronDown className="h-3 w-3" />
          Advanced — raw schema JSON
        </summary>
        <div className="space-y-2 border-t border-border/60 p-3">
          <p className="text-xs text-muted-foreground">
            Frictionless Table Schema. Editing this overwrites the picker
            selection above.
          </p>
          <textarea
            value={rawSchemaJson}
            onChange={(e) => setRawSchemaJson(e.target.value)}
            className="h-32 w-full rounded border border-border/60 p-2 font-mono text-xs"
            placeholder='{"fields":[{"name":"memberId","type":"string","constraints":{"required":true}}]}'
          />
          {rawError && <p className="text-xs text-destructive">{rawError}</p>}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={applyRawSchema}
            disabled={!rawSchemaJson.trim()}
          >
            Apply JSON
          </Button>
        </div>
      </details>

      <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => closeOverlay(FORM_OVERLAY_ID)}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!isValid || submitting || !quoteId}
          data-testid="census-format-submit"
        >
          {submitting ? "Saving…" : "Save format"}
        </Button>
      </div>
    </div>
  );
};
