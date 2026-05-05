"use client";

import { cn } from "@/lib/utils";
import { useTenantConfig } from "@/contexts/TenantConfigContext";
import { DateDisplayProps } from "./types";
import { formatDateForDisplay } from "./utils";

export function DateDisplay({ value = "", className }: DateDisplayProps) {
  const { dateFormat } = useTenantConfig();
  return (
    <span className={cn("text-sm tabular-nums", className)}>
      {value ? formatDateForDisplay(value, dateFormat) : "—"}
    </span>
  );
}
