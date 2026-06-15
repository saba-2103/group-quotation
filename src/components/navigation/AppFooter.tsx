'use client';

import { usePathname } from 'next/navigation';
import { CircleHelp } from 'lucide-react';
import { Kbd } from '@/components/ui/kbd';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/components/providers/AppContextProvider';
import { itemMatchesPathname } from '@/components/navigation/navHelpers';

const SHORTCUTS = [
  { key: 'N',  label: 'New'    },
  { key: 'E',  label: 'Edit'   },
  { key: 'D',  label: 'Del'    },
  { key: 'F4', label: 'Lookup' },
];

export function AppFooter({ className }: { className?: string }) {
  const { config } = useAppContext();
  const pathname = usePathname();

  const items = config?.navigation.menuItems ?? [];
  const activeItem = items.find((item) => itemMatchesPathname(pathname, item)) ?? null;
  const hasSubmenu =
    activeItem != null &&
    activeItem.subMenuItems != null &&
    activeItem.subMenuItems.length > 0;

  return (
    <footer
      className={cn(
        'flex items-center justify-between shrink-0 pr-4 py-1 bg-sidebar',
        hasSubmenu ? 'pl-4' : 'pl-7',
        className,
      )}
    >
      {/* LHS: keyboard shortcut hints */}
      <div className="flex items-center gap-3">
        {SHORTCUTS.map(({ key, label }) => (
          <span key={label} className="flex items-center gap-1">
            <Kbd>{key}</Kbd>
            <span className="text-[12px] leading-4 text-muted-foreground">{label}</span>
          </span>
        ))}
      </div>

      {/* RHS: watermark + help */}
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          <span className="text-[12px] leading-4 text-black/30">Powered by</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.svg" alt="Anaira" className="h-4 w-auto opacity-30" />
          <span className="text-[12px] leading-4 font-medium text-black/30">Anaira</span>
        </span>
        <Button variant="ghost" size="icon" className="size-6 text-muted-foreground hover:text-foreground">
          <CircleHelp className="size-5" />
        </Button>
      </div>
    </footer>
  );
}
