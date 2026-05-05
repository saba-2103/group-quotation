"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { useSmartQuery } from "@/hooks/useSmartQuery";

interface TrackedDocument {
  id: string;
  name: string;
  category: string;
  status: string;
  uploadedAt?: string;
  expiryDate?: string | null;
}

interface DocumentStatusTrackerConfig {
  title?: string;
  documents?: TrackedDocument[];
  dataSource?: { api: { endpoint: string } };
}

function isExpiringSoon(expiryDate: string | null | undefined): boolean {
  if (!expiryDate) return false;
  const exp = new Date(expiryDate);
  const soon = new Date();
  soon.setMonth(soon.getMonth() + 6);
  return exp <= soon;
}

export const DocumentStatusTracker: React.FC<DocumentStatusTrackerConfig> = ({
  title = "Document Status",
  documents = [],
  dataSource,
}) => {
  const { data } = useSmartQuery(
    dataSource ? { api: { endpoint: dataSource.api.endpoint, method: 'GET' as const } } : undefined
  );

  const items: TrackedDocument[] = (data as { documents?: TrackedDocument[] } | null)?.documents ?? documents;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-medium text-sm">{title}</h3>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-xs text-muted-foreground">Document</th>
              <th className="px-4 py-2 text-left font-medium text-xs text-muted-foreground">Category</th>
              <th className="px-4 py-2 text-left font-medium text-xs text-muted-foreground">Status</th>
              <th className="px-4 py-2 text-left font-medium text-xs text-muted-foreground">Expiry</th>
            </tr>
          </thead>
          <tbody>
            {items.map((doc: TrackedDocument) => (
              <tr key={doc.id} className="border-t hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2 font-medium">{doc.name}</td>
                <td className="px-4 py-2 text-muted-foreground">{doc.category}</td>
                <td className="px-4 py-2">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                      doc.status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
                    )}
                  >
                    {doc.status}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {doc.expiryDate ? (
                    <span className={cn("text-xs", isExpiringSoon(doc.expiryDate) ? "text-yellow-700 font-medium" : "text-muted-foreground")}>
                      {new Date(doc.expiryDate).toLocaleDateString("en-IN")}
                      {isExpiringSoon(doc.expiryDate) && " ⚠"}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No documents found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
