'use client';

// Shared async mock delay used by all dashboard hooks.
export function mockDelay(ms = 200): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
