"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { useSmartQuery } from "@/hooks/useSmartQuery";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

interface LedgerEntry {
  id: string;
  transactionDate: string;
  type: "Credit" | "Debit";
  amount: number;
  balance: number;
  description: string;
  referenceId?: string | null;
}

interface LedgerTableConfig {
  title?: string;
  currency?: string;
  entries?: LedgerEntry[];
  dataSource?: { api: { endpoint: string } };
}

function fmt(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export const LedgerTable: React.FC<LedgerTableConfig> = ({
  title = "Transaction Ledger",
  currency = "INR",
  entries = [],
  dataSource,
}) => {
  const { data } = useSmartQuery(
    dataSource ? { api: { endpoint: dataSource.api.endpoint, method: 'GET' as const } } : undefined
  );

  const items: LedgerEntry[] = (data as { ledger?: LedgerEntry[] } | null)?.ledger ?? entries;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-medium text-sm">{title}</h3>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Description</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Ref</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Debit</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Credit</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Balance</th>
            </tr>
          </thead>
          <tbody>
            {items.map((entry: LedgerEntry) => (
              <tr key={entry.id} className="border-t hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(entry.transactionDate).toLocaleDateString("en-IN")}
                </td>
                <td className="px-4 py-2">{entry.description}</td>
                <td className="px-4 py-2 text-xs font-mono text-muted-foreground">{entry.referenceId ?? "—"}</td>
                <td className="px-4 py-2 text-right">
                  {entry.type === "Debit" ? (
                    <span className="flex items-center justify-end gap-1 text-red-600 font-medium">
                      <ArrowUpCircle className="h-3.5 w-3.5" />
                      {fmt(entry.amount, currency)}
                    </span>
                  ) : "—"}
                </td>
                <td className="px-4 py-2 text-right">
                  {entry.type === "Credit" ? (
                    <span className="flex items-center justify-end gap-1 text-green-600 font-medium">
                      <ArrowDownCircle className="h-3.5 w-3.5" />
                      {fmt(entry.amount, currency)}
                    </span>
                  ) : "—"}
                </td>
                <td className="px-4 py-2 text-right font-medium">{fmt(entry.balance, currency)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
