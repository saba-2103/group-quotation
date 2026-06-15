'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useRole } from '@/hooks/useRole';
import { isInternalRole } from '@/lib/permissions';
import { useHandoffStore } from '@/stores/handoffStore';
import { AppContextProvider } from '@/components/providers/AppContextProvider';
import { SidebarProvider } from '@/components/ui/sidebar';
import { DualPanelNav } from '@/components/navigation/DualPanelNav';
import { GlobalHeader } from '@/components/navigation/GlobalHeader';
import { BreadcrumbBar } from '@/components/navigation/BreadcrumbBar';
import { AppFooter } from '@/components/navigation/AppFooter';
import { ContentFrameWrapper, RhsColumn } from '@/components/navigation/MainShell';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { role } = useRole();
  const hydrate = useHandoffStore((s) => s.hydrate);

  useEffect(() => {
    if (!isInternalRole(role) && pathname !== '/rfqs' && pathname !== '/dashboard') {
      router.replace('/rfqs');
    }
  }, [role, pathname, router]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <AppContextProvider>
      <SidebarProvider defaultOpen={true}>
        <DualPanelNav />
        <main className="w-full min-w-0 flex-1 overflow-hidden bg-sidebar flex flex-col h-full">
          <RhsColumn>
            <GlobalHeader />
            <ContentFrameWrapper>
              <div className="flex flex-col h-full bg-background border border-border/40 rounded-2xl overflow-hidden">
                <BreadcrumbBar />
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {children}
                </div>
              </div>
            </ContentFrameWrapper>
          </RhsColumn>
          <AppFooter />
        </main>
      </SidebarProvider>
    </AppContextProvider>
  );
}

