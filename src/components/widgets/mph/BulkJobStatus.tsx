"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";

type JobStatus =
  | "Received"
  | "Parsing"
  | "Structure Failed"
  | "Validating"
  | "Validated"
  | "Approval Pending"
  | "Applying"
  | "Partially Applied"
  | "Applied"
  | "Repair Pending"
  | "Rejected"
  | "Cancelled";

interface BulkJobRecord {
  row: number;
  employeeId?: string;
  name?: string;
  error?: string;
  status: "Valid" | "Error" | "Applied" | "Skipped";
}

interface BulkJobStatusConfig {
  jobId?: string;
  status?: JobStatus;
  totalRows?: number;
  validRows?: number;
  errorRows?: number;
  appliedRows?: number;
  errors?: BulkJobRecord[];
  dataSource?: { api: { endpoint: string } };
}

const statusIcon: Record<string, React.ReactNode> = {
  Applied: <CheckCircle2 className="h-5 w-5 text-green-600" />,
  "Structure Failed": <XCircle className="h-5 w-5 text-red-600" />,
  Rejected: <XCircle className="h-5 w-5 text-red-600" />,
  Cancelled: <XCircle className="h-5 w-5 text-gray-500" />,
  "Partially Applied": <AlertTriangle className="h-5 w-5 text-yellow-600" />,
  "Repair Pending": <AlertTriangle className="h-5 w-5 text-yellow-600" />,
};

const spinningStatuses = new Set(["Received", "Parsing", "Validating", "Applying"]);

export const BulkJobStatus: React.FC<BulkJobStatusConfig> = ({
  jobId,
  status = "Received",
  totalRows = 0,
  validRows = 0,
  errorRows = 0,
  appliedRows = 0,
  errors = [],
}) => {
  const isSpinning = spinningStatuses.has(status);
  const icon = isSpinning ? (
    <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
  ) : (
    statusIcon[status] ?? <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
  );

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="font-medium">{status}</p>
          {jobId && <p className="text-xs text-muted-foreground">Job ID: {jobId}</p>}
        </div>
      </div>

      {totalRows > 0 && (
        <div className="grid grid-cols-4 gap-3 text-center text-sm">
          {[
            { label: "Total", value: totalRows, color: "text-foreground" },
            { label: "Valid", value: validRows, color: "text-green-700" },
            { label: "Errors", value: errorRows, color: "text-red-600" },
            { label: "Applied", value: appliedRows, color: "text-blue-600" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-md border bg-muted/30 p-2">
              <p className={cn("text-xl font-semibold", stat.color)}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {errors.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground uppercase">Error Records</p>
          <div className="max-h-48 overflow-y-auto rounded border">
            {errors.map((err, i) => (
              <div key={i} className="flex items-start gap-3 border-b px-3 py-2 text-xs last:border-0">
                <span className="text-muted-foreground w-8">#{err.row}</span>
                <span className="font-medium flex-1">{err.employeeId ?? err.name ?? "—"}</span>
                <span className="text-red-600">{err.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
