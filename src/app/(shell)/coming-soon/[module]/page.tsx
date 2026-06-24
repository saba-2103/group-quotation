'use client';

import { use } from 'react';
import { Clock } from 'lucide-react';

interface Props {
  params: Promise<{ module: string }>;
}

export default function ComingSoonPage({ params }: Props) {
  const { module } = use(params);
  const label = module
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 text-center px-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Clock className="size-7 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-foreground">{label}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-xs leading-relaxed">
          This module is coming soon. We&apos;re working on it and it will be available shortly.
        </p>
      </div>
    </div>
  );
}
