import { cva } from "class-variance-authority";

export const tabsListVariants = cva("flex items-center text-muted-foreground", {
    variants: {
        variant: {
            default: "h-10 rounded-md bg-muted p-1 justify-start",
            case: "flex-nowrap border-b-0",
        },
    },
    defaultVariants: {
        variant: "case",
    },
});

export const tabsTriggerVariants = cva(
    "inline-flex items-center justify-center cursor-pointer whitespace-nowrap flex-shrink-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    {
        variants: {
            variant: {
                default:
                    "rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
                case: "relative px-3 py-3 text-sm font-medium gap-2 text-muted-foreground hover:text-foreground disabled:hover:text-muted-foreground border-b-2 border-transparent data-[state=active]:text-primary data-[state=active]:border-primary",
            },
        },
        defaultVariants: {
            variant: "case",
        },
    }
);
