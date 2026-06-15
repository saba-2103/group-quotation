"use client";

import { BellDot, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { useModKey } from "@/hooks/useModKey";

export function GlobalHeader() {
    const mod = useModKey();

    return (
        <header className="flex h-12 shrink-0 items-center justify-between bg-sidebar pr-4">
            {/* LHS — 480px search input */}
            <div className="relative flex items-center w-[480px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                    placeholder="Search"
                    className="pl-8 pr-[72px] h-8 text-sm bg-background border-border shadow-xs rounded-lg"
                />
                <div className="absolute right-2 flex items-center gap-1 pointer-events-none">
                    <Kbd>{mod}</Kbd>
                    <span className="text-xs text-foreground leading-none">+</span>
                    <Kbd>K</Kbd>
                </div>
            </div>

            {/* RHS — bell icon */}
            <Button variant="ghost" size="icon-sm" aria-label="Notifications">
                <BellDot className="size-4" />
            </Button>
        </header>
    );
}
