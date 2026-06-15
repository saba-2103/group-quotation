import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlaceholderPageProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  badge?: string;
  badgeColor?: "indigo" | "amber" | "green" | "slate";
}

const badgeStyles: Record<NonNullable<PlaceholderPageProps["badgeColor"]>, string> = {
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  green: "bg-green-50 text-green-700 ring-green-200",
  slate: "bg-slate-50 text-slate-600 ring-slate-200",
};

export function PlaceholderPage({
  icon: Icon,
  title,
  description,
  badge,
  badgeColor = "indigo",
}: PlaceholderPageProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb-style header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <Icon className="size-5" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-foreground leading-tight">{title}</h1>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {badge && (
          <span
            className={cn(
              "ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
              badgeStyles[badgeColor],
            )}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Placeholder body */}
      <div className="rounded-xl border border-dashed border-border bg-muted/30 flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <Icon className="size-10 opacity-20" />
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs">This page is under construction.</p>
      </div>
    </div>
  );
}
