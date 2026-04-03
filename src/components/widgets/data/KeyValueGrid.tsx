import React from "react";
import { WidgetConfig } from "@/types/widget";
import { useSmartQuery } from "@/hooks/useSmartQuery";
import { KeyValueGridWidgetProps, ApiResponseData, DataRecord, KeyValueField, FieldValue, BadgeValueMapping } from "./types";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { DateDisplay } from "@/components/widgets/controls/dateWidget/DateDisplay";
import { BADGE_COLOR_TO_VARIANT } from "./DataTable/constants";
import * as Icons from "lucide-react";

function renderFieldValue(field: KeyValueField, value: FieldValue | undefined): React.ReactNode {
  if (value === null || value === undefined) return <span>-</span>;

  switch (field.type) {
    case "badge": {
      const badgeMapping: BadgeValueMapping | undefined = field.valueMapping?.find(
        (m) => m.value === String(value)
      );
      const resolvedVariant =
        badgeMapping?.variant ??
        BADGE_COLOR_TO_VARIANT[badgeMapping?.color ?? ""] ??
        "outline";
      return (
        <Badge variant={resolvedVariant as Parameters<typeof Badge>[0]["variant"]}>
          {badgeMapping?.label ?? String(value)}
        </Badge>
      );
    }
    case "date":
      return <DateDisplay value={String(value)} />;
    default:
      return <span>{String(value)}</span>;
  }
}

export const KeyValueGrid: React.FC<{ config: WidgetConfig }> = ({ config }) => {
  const { props = {}, dataSource } = config;
  const { fields = [], data: propsData, isLoading: propsLoading, error: propsError } = props as KeyValueGridWidgetProps;

  const {
    data: queryData,
    isLoading: queryIsLoading,
    error: queryError
  } = useSmartQuery(propsData == null ? dataSource : undefined);

  const isLoading = propsLoading ?? queryIsLoading;
  const error = propsError ?? queryError;

  if (isLoading) return <LoadingState message="Loading" />;
  if (error) return <ErrorState message="Failed to load data" />;

  const rawData = propsData ?? (queryData as ApiResponseData | null) ?? undefined;
  const nestedValue = dataSource?.valueKey && rawData ? rawData[dataSource.valueKey] : undefined;
  const sourceData: DataRecord | undefined =
    nestedValue !== null && nestedValue !== undefined && typeof nestedValue === "object"
      ? nestedValue
      : (rawData as DataRecord | undefined);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-card rounded-lg border shadow-sm">
      {fields.map((field: KeyValueField) => {
        const iconKey = field.icon as keyof typeof Icons;
        const IconComponent = field.icon
          ? ((Icons[iconKey] as React.ComponentType<{ className?: string }>) ?? null)
          : null;
        const value = sourceData ? sourceData[field.accessorKey] : undefined;

        return (
          <div key={field.id} className="flex flex-col space-y-1.5">
            <div className="flex items-center text-xs text-muted-foreground space-x-1.5 font-medium uppercase tracking-wider">
              <span>{field.label}</span>
            </div>
            <div className="text-sm font-semibold text-foreground">
              {renderFieldValue(field, value)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
