"use client";

import React, { useState } from "react";
import { WidgetConfig } from "@/types/widget";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorEntry {
  error_code: string;
  error_desc: string;
}

export const ErrorBanner: React.FC<{ config: WidgetConfig }> = ({ config }) => {
  const errors: ErrorEntry[] = config.props?.errors ?? [];
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = errors.filter((e) => !dismissed.has(e.error_code));

  if (visible.length === 0) return null;

  const handleDismiss = (code: string) => {
    setDismissing((prev) => new Set(prev).add(code));
    setTimeout(() => {
      setDismissed((prev) => new Set(prev).add(code));
      setDismissing((prev) => {
        const next = new Set(prev);
        next.delete(code);
        return next;
      });
    }, 350);
  };

  return (
    <div className="flex flex-col gap-1.5 overflow-hidden">
      {visible.map((error) => (
        <div
          key={error.error_code}
          className={cn(
            "group relative flex items-start gap-0 overflow-hidden rounded-lg transition-all duration-350 ease-in-out",
            "border border-red-300 bg-red-50 dark:border-red-900/40 dark:bg-red-950/40",
            dismissing.has(error.error_code)
              ? "translate-x-full opacity-0 max-h-0 mb-0"
              : "translate-x-0 opacity-100 max-h-24",
          )}
        >
          {/* Left accent bar */}
          <div className="w-1 self-stretch shrink-0 rounded-l-lg bg-red-500" />

          {/* Icon */}
          <div className="flex items-start gap-3 flex-1 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xs font-mono font-semibold text-red-600 dark:text-red-400 tracking-wide">
                  {error.error_code}
                </span>
                <span className="text-sm text-red-800/80 dark:text-red-200/80 leading-snug">
                  {error.error_desc}
                </span>
              </div>
            </div>
          </div>

          {/* Dismiss */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 mt-1.5 mr-1.5 shrink-0 rounded-md text-red-400 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/40"
            onClick={() => handleDismiss(error.error_code)}
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
};
