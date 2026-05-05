"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WizardStep {
  id: string;
  title: string;
  description?: string;
}

interface WizardContainerConfig {
  title?: string;
  steps?: WizardStep[];
  children?: React.ReactNode;
}

export const WizardContainer: React.FC<WizardContainerConfig> = ({ title, steps = [], children }) => {
  const [activeStep, setActiveStep] = React.useState(0);

  return (
    <div className="flex flex-col gap-6">
      {title && <h2 className="text-xl font-semibold">{title}</h2>}
      {steps.length > 0 && (
        <nav className="flex items-center gap-0">
          {steps.map((step, i) => (
            <React.Fragment key={step.id}>
              <button
                onClick={() => setActiveStep(i)}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 text-sm transition-colors",
                  i === activeStep ? "text-primary font-medium" : "text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold",
                    i < activeStep && "border-primary bg-primary text-white",
                    i === activeStep && "border-primary text-primary",
                    i > activeStep && "border-muted text-muted-foreground"
                  )}
                >
                  {i < activeStep ? "✓" : i + 1}
                </span>
                {step.title}
              </button>
              {i < steps.length - 1 && (
                <div className={cn("h-px flex-1", i < activeStep ? "bg-primary" : "bg-border")} />
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="rounded-lg border bg-card p-6">{children}</div>
      {steps.length > 0 && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setActiveStep((s) => Math.max(0, s - 1))} disabled={activeStep === 0}>
            Back
          </Button>
          <Button onClick={() => setActiveStep((s) => Math.min(steps.length - 1, s + 1))} disabled={activeStep === steps.length - 1}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
