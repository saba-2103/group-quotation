"use client";
import React from "react";
import { cn } from "@/lib/utils";

interface SLATimerConfig {
  dueDate?: string;
  label?: string;
  status?: "On Track" | "At Risk" | "Breached";
}

function getDaysRemaining(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export const SLATimer: React.FC<SLATimerConfig> = ({ dueDate, label = "SLA Due", status }) => {
  if (!dueDate) return null;

  const days = getDaysRemaining(dueDate);
  const derived = status ?? (days < 0 ? "Breached" : days <= 3 ? "At Risk" : "On Track");

  const color =
    derived === "Breached"
      ? "text-red-600 bg-red-50 border-red-200"
      : derived === "At Risk"
      ? "text-yellow-700 bg-yellow-50 border-yellow-200"
      : "text-green-700 bg-green-50 border-green-200";

  const dueLabel =
    days < 0
      ? `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`
      : days === 0
      ? "Due today"
      : `${days} day${days === 1 ? "" : "s"} remaining`;

  return (
    <div className={cn("inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium", color)}>
      <span className="text-xs font-normal opacity-70">{label}:</span>
      <span>{dueLabel}</span>
      <span className="text-xs opacity-50">({new Date(dueDate).toLocaleDateString("en-IN")})</span>
    </div>
  );
};
