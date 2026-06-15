'use client';

// Standalone confirm-maf button. Lives outside ActionBar so it can stamp
// `confirmedAt` with a click-time ISO timestamp via the confirmMaf helper
// without teaching the shared action-handler about per-action body tokens.
// Gating mirrors ActionBar: visible to role=`member` only, enabled only in
// state MAF_PENDING.

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { LucideIcon } from '@/components/ui/lucide-icon';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from '@/components/ui/toast';
import { useRole } from '@/hooks/useRole';
import { useSmartQuery } from '@/hooks/useSmartQuery';
import { confirmMaf } from '@/lib/api/issuance';
import type { WidgetConfig } from '@/types/widget';

interface ConfirmMafButtonProps {
  config: WidgetConfig & {
    props?: {
      memberId: string;
      refreshKey?: string;
    };
  };
}

export const ConfirmMafButton: React.FC<ConfirmMafButtonProps> = ({ config }) => {
  const { memberId, refreshKey } = (config.props ?? {}) as {
    memberId: string;
    refreshKey?: string;
  };
  const { role } = useRole();
  const queryClient = useQueryClient();
  const { data: member } = useSmartQuery({
    api: {
      endpoint: `/api/issuance/policy-members/${memberId}`,
      method: 'GET',
    },
  });

  const { mutateAsync, isPending } = useMutation({
    mutationFn: () => confirmMaf(memberId, new Date().toISOString()),
    onSuccess: () => {
      toast.success('Enrolment confirmed; member will be activated shortly.');
      if (refreshKey) {
        queryClient.invalidateQueries({
          predicate: (q) => {
            const key = q.queryKey[0];
            return typeof key === 'string' && key.startsWith(refreshKey);
          },
        });
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    },
  });

  if ((role as string) !== 'member') return null;

  const state = (member as { state?: string } | undefined)?.state;
  const stateOk = state === 'MAF_PENDING';
  const disabledReason = !stateOk
    ? `Not available in ${state || 'this state'}`
    : undefined;

  const button = (
    <Button
      variant="default"
      size="sm"
      disabled={!stateOk || isPending}
      onClick={() => mutateAsync()}
      data-action-id="confirm-maf"
    >
      <LucideIcon name="Check" className="mr-1 h-4 w-4" />
      Confirm enrolment
    </Button>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-card/40 p-3 shadow-sm"
        role="toolbar"
        aria-label="Confirm enrolment"
      >
        {disabledReason ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">{button}</span>
            </TooltipTrigger>
            <TooltipContent>{disabledReason}</TooltipContent>
          </Tooltip>
        ) : (
          button
        )}
      </div>
    </TooltipProvider>
  );
};
