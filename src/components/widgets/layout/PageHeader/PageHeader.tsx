"use client";

import React, { useState } from 'react';
import { WidgetConfig } from '@/types/widget';
import { cn } from '@/lib/utils';
import { ActionRenderer } from '../../controls/ActionRenderer';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import { HelpCircle } from 'lucide-react';
import { TransactionStatusBadge } from '../../items/TransactionStatusBadge';
import { ErrorBanner } from '../../items/ErrorBanner';
import { useActionHandler } from '@/hooks/useActionHandler';
import { ACTION_LABELS, BUTTON_ORDER, BUTTON_CONFIG } from './constants';

interface PageHeaderProps {
    config: WidgetConfig;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ config }) => {
    const {
        title,
        description,
        actions,
        validActions,
        validButtons,
        hasWorkflow,
        tranStatus,
        screenCode,
        helpText,
        backendErrors,
    } = config.props || {};

    const handleAction = useActionHandler();
    const [screenAction, setScreenAction] = useState<string>(validActions?.[0] ?? '');
    const [helpOpen, setHelpOpen] = useState(false);

    // Only render buttons that are both in BUTTON_ORDER and in validButtons prop
    const buttonsToShow = validButtons
        ? BUTTON_ORDER.filter((key) => validButtons.includes(key))
        : [];

    const errorBannerConfig: WidgetConfig = {
        id: `${config.id}-error-banner`,
        type: 'error-banner',
        props: { errors: backendErrors ?? [] },
    };

    return (
        <div className={cn("flex flex-col gap-3", config.props?.className)}>

            {/* ErrorBanner slot */}
            {backendErrors && backendErrors.length > 0 && (
                <ErrorBanner config={errorBannerConfig} />
            )}

            <header className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-3">

                    {/* Title + TransactionStatusBadge */}
                    <div className="flex items-center gap-3">
                        <div>
                            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
                            {description && <p className="text-muted-foreground mt-1">{description}</p>}
                        </div>
                        {hasWorkflow && tranStatus && (
                            <TransactionStatusBadge code={String(tranStatus)} />
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Action option box */}
                        {validActions && validActions.length > 0 && (
                            <Select value={screenAction} onValueChange={setScreenAction}>
                                <SelectTrigger className="w-36">
                                    <SelectValue placeholder="Action" />
                                </SelectTrigger>
                                <SelectContent>
                                    {validActions.map((act: string) => (
                                        <SelectItem key={act} value={act}>
                                            {ACTION_LABELS[act] ?? act}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* Custom action buttons from config */}
                        {actions && actions.length > 0 && actions.map((action: any) => (
                            <ActionRenderer key={action.id} action={action} />
                        ))}

                        {/* Submit / Close — PageHeader-owned system buttons */}
                        {buttonsToShow.map((key) => {
                            const btn = BUTTON_CONFIG[key];
                            return (
                                <Button
                                    key={key}
                                    size="sm"
                                    variant={btn.variant}
                                    onClick={() => handleAction({
                                        id: key,
                                        type: 'trigger-event',
                                        target: btn.event,
                                    })}
                                >
                                    {btn.label}
                                </Button>
                            );
                        })}

                        {/* Help icon */}
                        {screenCode && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setHelpOpen(true)}
                                aria-label="Screen help"
                            >
                                <HelpCircle className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            {/* Help sheet */}
            {screenCode && (
                <Sheet open={helpOpen} onOpenChange={setHelpOpen}>
                    <SheetContent side="right" className="w-96">
                        <SheetHeader>
                            <SheetTitle>Help</SheetTitle>
                            <SheetDescription className="text-xs text-muted-foreground">
                                Screen: {screenCode}
                            </SheetDescription>
                        </SheetHeader>
                        <div className="mt-4 text-sm text-foreground whitespace-pre-wrap">
                            {helpText ?? 'No help text available for this screen.'}
                        </div>
                    </SheetContent>
                </Sheet>
            )}
        </div>
    );
};
