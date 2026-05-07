'use client';

import { Badge } from '@/components/ui/badge';
import type { WidgetConfig } from '@/types/widget';

import {
  type EntityKind,
  getStateMeta,
} from './state-map';

interface StateBadgeProps {
  config?: WidgetConfig;
  // Direct-render mode (used by table cells) — schema-render mode reads
  // entity/state/value off config.props instead.
  entity?: EntityKind;
  state?: string;
  value?: string;
  className?: string;
}

export const StateBadge: React.FC<StateBadgeProps> = (props) => {
  const fromConfig = (props.config?.props ?? {}) as {
    entity?: EntityKind;
    state?: string;
    value?: string;
  };
  const entity = (props.entity ?? fromConfig.entity ?? 'quote') as EntityKind;
  const raw =
    props.state ??
    props.value ??
    fromConfig.state ??
    fromConfig.value ??
    '';
  const meta = getStateMeta(entity, raw);

  return (
    <Badge variant={meta.variant} className={props.className} aria-label={meta.label}>
      {meta.label}
    </Badge>
  );
};
