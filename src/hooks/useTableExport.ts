"use client";

import { useCallback } from "react";
import {
  ColumnConfig,
  TableRow,
} from "../components/widgets/data/DataTable/types";

type ExportFormat = "csv" | "xlsx" | "pdf";

interface UseTableExportOptions {
  columns: ColumnConfig[];
  widgetId?: string;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

const buildFilename = (widgetId?: string): string => {
  const date = new Date().toISOString().slice(0, 10);
  if (!widgetId) return `table-export_${date}`;
  const label = widgetId
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return `${label}_${date}`;
};

const toCell = (val: TableRow[string]) => String(val ?? "");

const getHeaders = (cols: ColumnConfig[]) => cols.map((c) => c.header);

const getMatrix = (rows: TableRow[], cols: ColumnConfig[]) =>
  rows.map((row) => cols.map((c) => toCell(row[c.accessorKey])));

// Append to body so all browsers reliably fire the download
const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ── CSV ───────────────────────────────────────────────────────────────────────

const escapeCsv = (val: string) =>
  /[,"\n]/.test(val) ? `"${val.replace(/"/g, '""')}"` : val;

const exportCSV = (
  rows: TableRow[],
  cols: ColumnConfig[],
  filename: string,
) => {
  const matrix = [getHeaders(cols), ...getMatrix(rows, cols)];
  const csv = matrix.map((row) => row.map(escapeCsv).join(",")).join("\n");
  triggerDownload(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    `${filename}.csv`,
  );
};

// ── XLSX ──────────────────────────────────────────────────────────────────────

const exportXLSX = async (
  rows: TableRow[],
  cols: ColumnConfig[],
  filename: string,
) => {
  const { utils, write } = await import("xlsx");
  const ws = utils.aoa_to_sheet([getHeaders(cols), ...getMatrix(rows, cols)]);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Sheet1");
  // Use write + Blob instead of writeFile to avoid Node.js fs in browser
  const buffer: ArrayBuffer = write(wb, { bookType: "xlsx", type: "array" });
  triggerDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${filename}.xlsx`,
  );
};

// ── PDF ───────────────────────────────────────────────────────────────────────

type PdfMake = {
  vfs: unknown;
  createPdf: (def: object) => { download: (name: string) => void };
};

const loadPdfMake = async (): Promise<PdfMake> => {
  // Sequential import so vfs_fonts is fully resolved before we assign it
  const { default: pdfMake } = await import("pdfmake/build/pdfmake");
  const fontsModule = await import("pdfmake/build/vfs_fonts");
  const instance = pdfMake as unknown as PdfMake;

  // In webpack/Next.js, CJS module.exports lands on .default.
  // Spread to a plain object so pdfmake's VFS bracket-access always works.
  const fontsDefault = (
    fontsModule as unknown as { default?: Record<string, string> }
  ).default;
  instance.vfs = fontsDefault
    ? { ...fontsDefault }
    : { ...(fontsModule as unknown as Record<string, string>) };

  return instance;
};

const exportPDF = async (
  rows: TableRow[],
  cols: ColumnConfig[],
  filename: string,
) => {
  const pdfMake = await loadPdfMake();
  const headers = getHeaders(cols);

  const headerRow = headers.map((h) => ({
    text: h,
    bold: true,
    fontSize: 9,
    fillColor: "#1e1e1e",
    color: "#ffffff",
  }));
  const body = getMatrix(rows, cols).map((row) =>
    row.map((cell) => ({ text: cell, fontSize: 9 })),
  );

  pdfMake
    .createPdf({
      pageOrientation: "landscape",
      defaultStyle: { font: "Roboto" },
      content: [
        {
          table: {
            headerRows: 1,
            widths: Array(headers.length).fill("*"),
            body: [headerRow, ...body],
          },
          layout: {
            fillColor: (i: number) => (i > 0 && i % 2 === 0 ? "#f5f5f5" : null),
          },
        },
      ],
    })
    .download(`${filename}.pdf`);
};

// ── Hook ──────────────────────────────────────────────────────────────────────

const exporters: Record<
  ExportFormat,
  (
    rows: TableRow[],
    cols: ColumnConfig[],
    filename: string,
  ) => Promise<void> | void
> = {
  csv: exportCSV,
  xlsx: exportXLSX,
  pdf: exportPDF,
};

export const useTableExport = ({
  columns,
  widgetId,
}: UseTableExportOptions) => {
  const exportData = useCallback(
    async (rows: TableRow[], format: ExportFormat) => {
      if (rows.length === 0) return;
      await exporters[format](rows, columns, buildFilename(widgetId));
    },
    [columns, widgetId],
  );

  return { exportData };
};
