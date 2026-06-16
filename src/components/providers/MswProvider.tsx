'use client';

import { useEffect, useState } from 'react';

export function MswProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    import('@/mocks/browser').then(async ({ worker }) => {
      await worker.start({ onUnhandledRequest: 'bypass' });
      await navigator.serviceWorker.ready;
      setReady(true);
    });
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
