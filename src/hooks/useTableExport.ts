"use client";

import { useCallback } from "react";
import { ColumnConfig, TableRow } from "../components/widgets/data/DataTable/types";
import { EXPORT_STYLE_CONFIG } from "../components/widgets/data/DataTable/constants";

type ExportFormat = "csv" | "xlsx" | "pdf";

interface UseTableExportOptions {
  columns: ColumnConfig[];
  widgetId?: string;
  downloadRef: React.RefObject<HTMLAnchorElement | null>;
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

const getHeaders = (cols: ColumnConfig[]): string[] =>
  cols.map((c) => c.header ?? c.label ?? c.accessorKey);

const getMatrix = (rows: TableRow[], cols: ColumnConfig[]) =>
  rows.map((row) => cols.map((c) => toCell(row[c.accessorKey])));

const triggerDownload = (
  blob: Blob,
  filename: string,
  ref: React.RefObject<HTMLAnchorElement | null>,
) => {
  if (!ref.current) return;
  const url = URL.createObjectURL(blob);
  ref.current.href = url;
  ref.current.download = filename;
  ref.current.click();
  URL.revokeObjectURL(url);
};

// ── CSV ───────────────────────────────────────────────────────────────────────

const escapeCsv = (val: string) =>
  /[,"\n]/.test(val) ? `"${val.replace(/"/g, '""')}"` : val;

const exportCSV = (
  rows: TableRow[],
  cols: ColumnConfig[],
  filename: string,
  ref: React.RefObject<HTMLAnchorElement | null>,
) => {
  const matrix = [getHeaders(cols), ...getMatrix(rows, cols)];
  const csv = matrix.map((row) => row.map(escapeCsv).join(",")).join("\n");
  triggerDownload(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    `${filename}.csv`,
    ref,
  );
};

// ── XLSX ──────────────────────────────────────────────────────────────────────

const exportXLSX = async (
  rows: TableRow[],
  cols: ColumnConfig[],
  filename: string,
  ref: React.RefObject<HTMLAnchorElement | null>,
) => {
  const { utils, write } = await import("xlsx");
  const ws = utils.aoa_to_sheet([getHeaders(cols), ...getMatrix(rows, cols)]);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, EXPORT_STYLE_CONFIG.xlsx.sheetName);
  const buffer: ArrayBuffer = write(wb, { bookType: "xlsx", type: "array" });
  triggerDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${filename}.xlsx`,
    ref,
  );
};

// ── PDF ───────────────────────────────────────────────────────────────────────

const loadPdfMake = async () => {
  const [pdfModule, fontsModule] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);
  const pdfMake = pdfModule.default;
  // pdfmake 0.3.x uses addVirtualFileSystem; vfs_fonts exports the flat font dictionary directly.
  pdfMake.addVirtualFileSystem(fontsModule.default);
  return pdfMake;
};

const exportPDF = async (
  rows: TableRow[],
  cols: ColumnConfig[],
  filename: string,
) => {
  const instance = await loadPdfMake();
  const { pdf } = EXPORT_STYLE_CONFIG;
  const headers = getHeaders(cols);

  const headerRow = headers.map((h) => ({
    text: h,
    bold: true,
    fontSize: pdf.fontSize,
    fillColor: pdf.headerFillColor,
    color: pdf.headerTextColor,
  }));
  const body = getMatrix(rows, cols).map((row) =>
    row.map((cell) => ({ text: cell, fontSize: pdf.fontSize })),
  );

  instance
    .createPdf({
      pageOrientation: pdf.orientation,
      defaultStyle: { font: pdf.font },
      content: [
        {
          table: {
            headerRows: 1,
            widths: Array(headers.length).fill("*"),
            body: [headerRow, ...body],
          },
          layout: {
            fillColor: (i: number) =>
              i > 0 && i % 2 === 0 ? pdf.alternateRowColor : null,
          },
        },
      ],
    })
    .download(`${filename}.pdf`);
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useTableExport = ({
  columns,
  widgetId,
  downloadRef,
}: UseTableExportOptions) => {
  const exportData = useCallback(
    async (rows: TableRow[], format: ExportFormat) => {
      if (rows.length === 0) return;
      const filename = buildFilename(widgetId);
      if (format === "csv") exportCSV(rows, columns, filename, downloadRef);
      else if (format === "xlsx") await exportXLSX(rows, columns, filename, downloadRef);
      else await exportPDF(rows, columns, filename);
    },
    [columns, widgetId, downloadRef],
  );

  return { exportData };
};
