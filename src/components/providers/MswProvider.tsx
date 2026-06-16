'use client';

import { useEffect, useState } from 'react';

export function MswProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(process.env.NODE_ENV !== 'development');

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    import('@/mocks/browser').then(async ({ worker }) => {
      await worker.start({ onUnhandledRequest: 'bypass' });
      // Ensure the service worker is actually controlling this page
      await navigator.serviceWorker.ready;
      setReady(true);
    });
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
