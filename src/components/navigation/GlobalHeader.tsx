"use client";

import { usePathname } from 'next/navigation';
import { BellDot, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { useModKey } from "@/hooks/useModKey";
import { usePlanTemplateVersion } from "@/stores/planTemplateVersionStore";
import { usePlanWizardVersion } from "@/stores/planWizardVersionStore";
import { RoleSwitcher } from "@/components/widgets/role/RoleSwitcher";

export function GlobalHeader() {
    const mod = useModKey();
    const pathname = usePathname();
    const { version, setVersion } = usePlanTemplateVersion();
    const { version: wizardVersion, setVersion: setWizardVersion } = usePlanWizardVersion();
    const showVersionTabs = pathname === '/rfq2/plan-templates/new';
    const showWizardVersionTabs = /\/(rfqs|rfq2)\/[^/]+\/plans\/new/.test(pathname);

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

            {/* RHS — version tabs (conditional) + bell */}
            <div className="flex items-center gap-2">
                {showVersionTabs && (
                    <div className="flex items-center rounded-md border border-border/50 bg-muted/40 p-0.5 gap-0.5">
                        {([1, 2, 3] as const).map((v) => (
                            <button
                                key={v}
                                type="button"
                                onClick={() => setVersion(v)}
                                className={cn(
                                    'rounded px-2.5 py-1 text-[11px] font-semibold transition-colors leading-none',
                                    version === v
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                V{v}
                            </button>
                        ))}
                    </div>
                )}
                {showWizardVersionTabs && (
                    <div className="flex items-center rounded-md border border-border/50 bg-muted/40 p-0.5 gap-0.5">
                        {([1, 2] as const).map((v) => (
                            <button
                                key={v}
                                type="button"
                                onClick={() => setWizardVersion(v)}
                                className={cn(
                                    'rounded px-2.5 py-1 text-[11px] font-semibold transition-colors leading-none',
                                    wizardVersion === v
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                V{v}
                            </button>
                        ))}
                    </div>
                )}
                <RoleSwitcher />
                <Button variant="ghost" size="icon-sm" aria-label="Notifications">
                    <BellDot className="size-4" />
                </Button>
            </div>
        </header>
    );
}
