"use client";

import React, { useMemo } from "react";
import { useSmartQuery } from "@/hooks/useSmartQuery";
import { getWidgetComponent } from "@/components/registry/WidgetRegistry";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import type { WidgetConfig, DataSourceConfig } from "@/types/widget";

interface EmptyState {
  title?: string;
  description?: string;
}

interface CardGridProps {
  id?: string;
  arrayPath?: string;
  cardWidgetType: string;
  cardProps?: Record<string, unknown>;
  columns?: number;
  emptyState?: EmptyState;
  loadingMessage?: string;
  errorMessage?: string;
  data?: unknown;
  isLoading?: boolean;
  error?: unknown;
  dataSource?: DataSourceConfig;
  props?: Record<string, unknown>;
}

interface CardGridConfigShape {
  id?: string;
  dataSource?: DataSourceConfig;
  props?: Omit<CardGridProps, "props">;
}

function getNested(source: unknown, path?: string): unknown {
  if (source == null || !path) return source;
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc != null && typeof acc === "object" && key in (acc as object)
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      source,
    );
}

export const CardGrid: React.FC<CardGridProps & { config?: CardGridConfigShape }> = (incoming) => {
  // WidgetRenderer flattens props onto the widget AND nests them under `config`.
  // Read from either shape so consumers can configure cardSchema either way.
  const flat = incoming as CardGridProps;
  const nested = incoming.config?.props as CardGridProps | undefined;
  const arrayPath = flat.arrayPath ?? nested?.arrayPath;
  const cardWidgetType = flat.cardWidgetType ?? nested?.cardWidgetType;
  const cardProps = flat.cardProps ?? nested?.cardProps ?? {};
  const columns = flat.columns ?? nested?.columns ?? 2;
  const emptyState = flat.emptyState ?? nested?.emptyState;
  const loadingMessage = flat.loadingMessage ?? nested?.loadingMessage ?? "Loading";
  const errorMessage = flat.errorMessage ?? nested?.errorMessage ?? "Failed to load";

  const propsData = flat.data ?? nested?.data;
  const propsLoading = flat.isLoading ?? nested?.isLoading;
  const propsError = flat.error ?? nested?.error;

  const ownDataSource = incoming.config?.dataSource ?? flat.dataSource;
  const { data: queryData, isLoading: queryLoading, error: queryError } = useSmartQuery(
    propsData == null ? ownDataSource : undefined,
  );

  const data = propsData ?? queryData;
  const isLoading = propsLoading ?? queryLoading;
  const error = propsError ?? queryError;

  const items = useMemo<unknown[]>(() => {
    const arr = getNested(data, arrayPath);
    return Array.isArray(arr) ? arr : [];
  }, [data, arrayPath]);

  if (isLoading) return <LoadingState message={loadingMessage} />;
  if (error) return <ErrorState message={errorMessage} />;

  if (!cardWidgetType) {
    return (
      <div className="rounded-md border border-destructive/40 p-4 text-sm text-destructive">
        card-grid: missing `cardWidgetType`.
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-muted-foreground/30 p-8 text-center">
        <p className="text-sm font-medium text-foreground">
          {emptyState?.title ?? "No items"}
        </p>
        {emptyState?.description && (
          <p className="mt-1 text-sm text-muted-foreground">{emptyState.description}</p>
        )}
      </div>
    );
  }

  const Card = getWidgetComponent(cardWidgetType);

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0, 1fr))` }}
    >
      {items.map((item, idx) => {
        // Build a synthetic WidgetConfig per card so the child widget receives
        // it in the same shape WidgetRenderer would provide. `parent` exposes
        // the root response so cards can read sibling fields (status, etc.)
        // without each card refetching the same query.
        const childConfig: WidgetConfig = {
          id: `${flat.id ?? incoming.config?.id ?? "card"}-item-${idx}`,
          type: cardWidgetType as WidgetConfig["type"],
          props: { ...cardProps, item, parent: data },
        };
        return (
          <Card key={childConfig.id} config={childConfig} {...childConfig.props} />
        );
      })}
    </div>
  );
};
