'use client';

import { useEffect } from 'react';

/**
 * Attaches a scroll listener to the document via event delegation.
 * When any element scrolls it receives the `is-scrolling` class, which the
 * CSS uses to show the scrollbar thumb. The class is removed ~800 ms after
 * scrolling stops, triggering the CSS fade-out transition.
 */
export function ScrollbarController() {
  useEffect(() => {
    const timers = new WeakMap<Element, ReturnType<typeof setTimeout>>();

    function handleScroll(e: Event) {
      const el = e.target;
      if (!(el instanceof Element)) return;

      el.classList.add('is-scrolling');

      const existing = timers.get(el);
      if (existing) clearTimeout(existing);

      timers.set(
        el,
        setTimeout(() => {
          el.classList.remove('is-scrolling');
          timers.delete(el);
        }, 800),
      );
    }

    document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', handleScroll, { capture: true });
  }, []);

  return null;
}
