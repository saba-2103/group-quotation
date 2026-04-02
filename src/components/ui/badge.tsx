import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-primary/20 bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-secondary/20 bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-green-300 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        warning:
          "border-yellow-300 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
        info: "border-blue-300 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
        teal: "border-cyan-300 bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
        amber:
          "border-amber-300 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
        grey: "border-gray-300 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
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
