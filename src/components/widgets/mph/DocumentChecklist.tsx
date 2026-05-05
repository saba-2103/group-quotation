"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, XCircle, Upload } from "lucide-react";

interface ChecklistItem {
  name: string;
  status: "Accepted" | "Pending" | "Under Review" | "Rejected" | "Not Uploaded";
  mandatory?: boolean;
}

interface DocumentChecklistConfig {
  title?: string;
  items?: ChecklistItem[];
  dataSource?: { api: { endpoint: string } };
}

const statusIcon: Record<ChecklistItem["status"], React.ReactNode> = {
  Accepted: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  "Under Review": <Clock className="h-4 w-4 text-blue-500" />,
  Rejected: <XCircle className="h-4 w-4 text-red-500" />,
  Pending: <Upload className="h-4 w-4 text-yellow-500" />,
  "Not Uploaded": <Upload className="h-4 w-4 text-muted-foreground" />,
};

export const DocumentChecklist: React.FC<DocumentChecklistConfig> = ({ title = "Documents", items = [] }) => {
  const accepted = items.filter((i) => i.status === "Accepted").length;
  const total = items.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">{title}</h3>
        <span className="text-xs text-muted-foreground">
          {accepted}/{total} accepted
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item, i) => (
          <li key={i} className={cn("flex items-center gap-3 rounded-md border px-3 py-2 text-sm",
            item.status === "Accepted" && "border-green-200 bg-green-50",
            item.status === "Rejected" && "border-red-200 bg-red-50",
          )}>
            {statusIcon[item.status]}
            <span className="flex-1">{item.name}</span>
            {item.mandatory && <span className="text-xs text-muted-foreground">Required</span>}
            <span className={cn("text-xs font-medium",
              item.status === "Accepted" && "text-green-600",
              item.status === "Rejected" && "text-red-600",
              item.status === "Under Review" && "text-blue-600",
              item.status === "Pending" && "text-yellow-600",
            )}>
              {item.status}
            </span>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-sm text-muted-foreground px-3 py-2">No documents required.</li>
        )}
      </ul>
    </div>
  );
};
