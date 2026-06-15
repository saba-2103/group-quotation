import { RfqStatus } from '@/lib/types';

const HINTS: Record<RfqStatus, string> = {
  [RfqStatus.DATA_PENDING]:           'Complete key data & census',
  [RfqStatus.CENSUS_CLEANED]:         'Add claims experience',
  [RfqStatus.EXPERIENCE_NORMALIZED]:  'Author plans',
  [RfqStatus.BENEFITS_READY]:         'Dispatch for pricing',
  [RfqStatus.PRICING]:                'Awaiting actuary',
  [RfqStatus.PRICING_IN_PROGRESS]:    'Pricing in progress',
  [RfqStatus.UW_REVIEW]:              'Awaiting UW decision',
  [RfqStatus.QUOTE_GENERATED]:        'Share quote with broker',
  [RfqStatus.SHARED]:                 'Awaiting broker response',
  [RfqStatus.NEGOTIATION]:            'Log latest broker counter',
  [RfqStatus.FINAL]:                  'Freeze the aligned version',
  [RfqStatus.ISSUED]:                 'Capture final placement',
  [RfqStatus.REJECTED]:               'Deal closed',
};

export function getNextActionHint(status: RfqStatus): string {
  return HINTS[status] ?? status;
}

export function NextActionHint({ status }: { status: RfqStatus }) {
  return <span className="text-muted-foreground">{getNextActionHint(status)}</span>;
}
