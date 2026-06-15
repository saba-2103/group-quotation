import { cn } from "@/lib/utils";

/**
 * shadcn-style <Kbd> component.
 * Renders a keyboard key badge matching the design system tokens.
 */
export function Kbd({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <kbd
            className={cn(
                "inline-flex items-center justify-center",
                "rounded-sm bg-muted px-1 py-0.5",
                "font-sans text-[12px] leading-4 text-muted-foreground",
                className,
            )}
        >
            {children}
        </kbd>
    );
}
