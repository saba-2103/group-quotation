"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { Shield, FileText, PiggyBank } from "lucide-react";

type ProductLine = "GTL" | "GCL" | "Savings" | "ULIP" | "Annuity" | "Pension";

interface PolicyContextChipConfig {
  policyId?: string;
  policyNumber?: string;
  productLine?: ProductLine;
  schemeName?: string;
  status?: string;
  size?: "sm" | "md";
}

const productConfig: Record<ProductLine, { icon: React.ReactNode; color: string; label: string }> = {
  GTL: { icon: <Shield className="h-3.5 w-3.5" />, color: "bg-blue-100 text-blue-800 border-blue-200", label: "GTL" },
  GCL: { icon: <FileText className="h-3.5 w-3.5" />, color: "bg-purple-100 text-purple-800 border-purple-200", label: "GCL" },
  Savings: { icon: <PiggyBank className="h-3.5 w-3.5" />, color: "bg-green-100 text-green-800 border-green-200", label: "SAV" },
  ULIP: { icon: <Shield className="h-3.5 w-3.5" />, color: "bg-orange-100 text-orange-800 border-orange-200", label: "ULIP" },
  Annuity: { icon: <Shield className="h-3.5 w-3.5" />, color: "bg-teal-100 text-teal-800 border-teal-200", label: "ANN" },
  Pension: { icon: <Shield className="h-3.5 w-3.5" />, color: "bg-indigo-100 text-indigo-800 border-indigo-200", label: "PEN" },
};

export const PolicyContextChip: React.FC<PolicyContextChipConfig> = ({
  policyNumber,
  productLine = "GTL",
  schemeName,
  status,
  size = "sm",
}) => {
  const config = productConfig[productLine] ?? productConfig.GTL;

  return (
    <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1", config.color, size === "md" && "px-4 py-1.5")}>
      {config.icon}
      <span className={cn("font-semibold", size === "sm" ? "text-xs" : "text-sm")}>{config.label}</span>
      {policyNumber && (
        <span className={cn("font-mono opacity-80", size === "sm" ? "text-xs" : "text-sm")}>{policyNumber}</span>
      )}
      {schemeName && !policyNumber && (
        <span className={cn("opacity-80", size === "sm" ? "text-xs" : "text-sm")}>{schemeName}</span>
      )}
      {status && (
        <span className={cn("opacity-60", size === "sm" ? "text-xs" : "text-sm")}>· {status}</span>
      )}
    </div>
  );
};
