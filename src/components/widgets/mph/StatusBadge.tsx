"use client";
import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeConfig {
  status?: string;
  value?: string;
  variant?: "default" | "outline";
}

const statusMap: Record<string, { bg: string; text: string }> = {
  // Positive
  Active: { bg: "bg-green-100", text: "text-green-800" },
  Paid: { bg: "bg-green-100", text: "text-green-800" },
  Approved: { bg: "bg-green-100", text: "text-green-800" },
  Applied: { bg: "bg-green-100", text: "text-green-800" },
  Issued: { bg: "bg-green-100", text: "text-green-800" },
  Verified: { bg: "bg-green-100", text: "text-green-800" },
  Completed: { bg: "bg-green-100", text: "text-green-800" },
  Resolved: { bg: "bg-green-100", text: "text-green-800" },

  // Neutral / In Progress
  Submitted: { bg: "bg-blue-100", text: "text-blue-800" },
  "Under Assessment": { bg: "bg-blue-100", text: "text-blue-800" },
  "Under Review": { bg: "bg-blue-100", text: "text-blue-800" },
  "In Progress": { bg: "bg-blue-100", text: "text-blue-800" },
  "Census In Progress": { bg: "bg-blue-100", text: "text-blue-800" },
  "Census Locked": { bg: "bg-blue-100", text: "text-blue-800" },
  Current: { bg: "bg-blue-100", text: "text-blue-800" },
  Renewing: { bg: "bg-blue-100", text: "text-blue-800" },

  // Warning
  "Pending Approval": { bg: "bg-yellow-100", text: "text-yellow-800" },
  "Pending Exit": { bg: "bg-yellow-100", text: "text-yellow-800" },
  "Documents Pending": { bg: "bg-yellow-100", text: "text-yellow-800" },
  "Query Raised": { bg: "bg-yellow-100", text: "text-yellow-800" },
  "Quote Received": { bg: "bg-yellow-100", text: "text-yellow-800" },
  Upcoming: { bg: "bg-yellow-100", text: "text-yellow-800" },
  "Pending Verification": { bg: "bg-yellow-100", text: "text-yellow-800" },
  "Open": { bg: "bg-yellow-100", text: "text-yellow-800" },
  Draft: { bg: "bg-gray-100", text: "text-gray-700" },

  // Negative
  Rejected: { bg: "bg-red-100", text: "text-red-800" },
  Overdue: { bg: "bg-red-100", text: "text-red-800" },
  Lapsed: { bg: "bg-red-100", text: "text-red-800" },
  Exited: { bg: "bg-red-100", text: "text-red-800" },
  Expired: { bg: "bg-red-100", text: "text-red-800" },
  Critical: { bg: "bg-red-100", text: "text-red-800" },
};

export const StatusBadge: React.FC<StatusBadgeConfig> = ({ status, value }) => {
  const label = status ?? value ?? "";
  const colors = statusMap[label] ?? { bg: "bg-gray-100", text: "text-gray-700" };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        colors.bg,
        colors.text
      )}
    >
      {label}
    </span>
  );
};
