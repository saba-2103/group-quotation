import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-destructive/20 bg-destructive/10 text-destructive dark:text-destructive",
        outline:
          "border-border text-foreground",
        success:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        warning:
          "border-yellow-500/25 bg-yellow-500/10 text-yellow-800 dark:text-yellow-300",
        info:
          "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
        teal:
          "border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-300",
        amber:
          "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        grey:
          "border-zinc-500/20 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
