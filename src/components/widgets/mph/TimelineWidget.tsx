"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { useSmartQuery } from "@/hooks/useSmartQuery";

interface TimelineEvent {
  id: string;
  status: string;
  actorName?: string;
  actorRole?: string;
  remarks?: string;
  timestamp: string;
}

interface TimelineWidgetConfig {
  title?: string;
  events?: TimelineEvent[];
  dataSource?: { api: { endpoint: string; params?: Record<string, string> } };
}

const statusColors: Record<string, string> = {
  Applied: "bg-green-500",
  Approved: "bg-green-400",
  Paid: "bg-green-600",
  Rejected: "bg-red-500",
  "Query Raised": "bg-yellow-500",
  Submitted: "bg-blue-500",
  Draft: "bg-gray-400",
};

export const TimelineWidget: React.FC<TimelineWidgetConfig> = ({ title, events = [], dataSource }) => {
  const { data: fetchedData } = useSmartQuery(
    dataSource ? { api: { endpoint: dataSource.api.endpoint, method: 'GET' as const } } : undefined
  );

  const items: TimelineEvent[] = (fetchedData as { timeline?: TimelineEvent[] } | null)?.timeline ?? events;

  return (
    <div className="flex flex-col gap-3">
      {title && <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">{title}</h3>}
      <ol className="relative border-l border-border ml-3">
        {items.map((event) => (
          <li key={event.id} className="mb-6 ml-6">
            <span
              className={cn(
                "absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background",
                statusColors[event.status] ?? "bg-primary"
              )}
            />
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-sm">{event.status}</span>
              {event.actorName && (
                <span className="text-xs text-muted-foreground">
                  {event.actorName}{event.actorRole ? ` (${event.actorRole})` : ""}
                </span>
              )}
              {event.remarks && <p className="text-sm text-muted-foreground">{event.remarks}</p>}
              <time className="text-xs text-muted-foreground">{new Date(event.timestamp).toLocaleString("en-IN")}</time>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="ml-6 text-sm text-muted-foreground">No timeline events yet.</li>}
      </ol>
    </div>
  );
};
