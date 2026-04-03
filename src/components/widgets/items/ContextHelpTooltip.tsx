"use client";

import React from "react";
import { WidgetConfig } from "@/types/widget";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ── Reusable wrapper component ─────────────────────────────────────────────────
// Wraps any field (including disabled ones) and shows help text after `delayMs`.
// Disabled inputs don't fire pointer events, so the trigger is a wrapping <span>
// with pointer-events-auto so hover is always captured.

interface ContextHelpTooltipProps {
  helpText: string;
  delayMs?: number; // hover duration before tooltip appears (default 500ms)
  children: React.ReactNode;
}

export const ContextHelpTooltip: React.FC<ContextHelpTooltipProps> = ({
  helpText,
  delayMs = 500,
  children,
}) => {
  if (!helpText) return <>{children}</>;

  return (
    <TooltipProvider delayDuration={delayMs}>
      <Tooltip>
        {/* span wrapper ensures hover fires even on disabled inputs */}
        <TooltipTrigger asChild>
          <span className="block w-full">{children}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
          {helpText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// ── Widget variant (for WidgetRegistry) ───────────────────────────────────────
// Wraps child widgets defined in config.children with the tooltip.

const WidgetRenderer = React.lazy(() =>
  import("@/components/registry/WidgetRenderer").then((m) => ({
    default: m.WidgetRenderer,
  })),
);

export const ContextHelpTooltipWidget: React.FC<{ config: WidgetConfig }> = ({
  config,
}) => {
  const { helpText, delayMs } = config.props || {};

  return (
    <ContextHelpTooltip helpText={helpText ?? ""} delayMs={delayMs}>
      <React.Suspense fallback={null}>
        {config.children?.map((child: WidgetConfig) => (
          <WidgetRenderer key={child.id} config={child} />
        ))}
      </React.Suspense>
    </ContextHelpTooltip>
  );
};
