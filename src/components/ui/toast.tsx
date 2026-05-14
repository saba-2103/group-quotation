'use client';

// Lightweight toast system. No third-party dep — uses zustand (already in
// the codebase for OverlayStore + WidgetState) plus shadcn/ui primitives.
//
// Usage:
//   import { toast, Toaster } from '@/components/ui/toast';
//   toast.success('Quote submitted');
//   toast.error('Census file format must be set before submitting');
//   toast.info('Pricing engine not yet wired');
//
// Mount <Toaster /> once at the app shell level (already done in
// src/app/layout.tsx). Toasts auto-dismiss after 5s by default; click to
// dismiss early.

import { useEffect } from 'react';
import { create } from 'zustand';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

import { cn } from '@/lib/utils';

type ToastSeverity = 'success' | 'error' | 'info';

interface ToastEntry {
  id: string;
  severity: ToastSeverity;
  message: string;
  durationMs: number;
}

interface ToastState {
  toasts: ToastEntry[];
  push: (entry: Omit<ToastEntry, 'id'>) => string;
  dismiss: (id: string) => void;
}

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (entry) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((state) => ({ toasts: [...state.toasts, { ...entry, id }] }));
    return id;
  },
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

// Imperative API. Mirrors sonner's surface so a future swap is mechanical.
export const toast = {
  success(message: string, options: { durationMs?: number } = {}): string {
    return useToastStore.getState().push({
      severity: 'success',
      message,
      durationMs: options.durationMs ?? 4500,
    });
  },
  error(message: string, options: { durationMs?: number } = {}): string {
    return useToastStore.getState().push({
      severity: 'error',
      message,
      durationMs: options.durationMs ?? 7000,
    });
  },
  info(message: string, options: { durationMs?: number } = {}): string {
    return useToastStore.getState().push({
      severity: 'info',
      message,
      durationMs: options.durationMs ?? 5000,
    });
  },
  dismiss(id: string): void {
    useToastStore.getState().dismiss(id);
  },
};

const SEVERITY_STYLES: Record<ToastSeverity, { wrap: string; icon: React.ComponentType<{ className?: string }> }> = {
  success: {
    wrap: 'border-emerald-500/60 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100',
    icon: CheckCircle2,
  },
  error: {
    wrap: 'border-destructive/60 bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive',
    icon: AlertCircle,
  },
  info: {
    wrap: 'border-sky-500/60 bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100',
    icon: Info,
  },
};

interface ToastItemProps {
  toast: ToastEntry;
}

function ToastItem({ toast: t }: ToastItemProps) {
  const dismiss = useToastStore((s) => s.dismiss);
  const styles = SEVERITY_STYLES[t.severity];
  const Icon = styles.icon;

  useEffect(() => {
    if (t.durationMs <= 0) return;
    const timer = setTimeout(() => dismiss(t.id), t.durationMs);
    return () => clearTimeout(timer);
  }, [t.id, t.durationMs, dismiss]);

  return (
    <div
      role={t.severity === 'error' ? 'alert' : 'status'}
      aria-live={t.severity === 'error' ? 'assertive' : 'polite'}
      className={cn(
        'pointer-events-auto flex w-96 max-w-full items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm',
        'animate-in fade-in slide-in-from-right-4 duration-200',
        styles.wrap,
      )}
      data-toast-severity={t.severity}
    >
      <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
      <div className="flex-1 text-sm leading-snug whitespace-pre-wrap break-words">
        {t.message}
      </div>
      <button
        type="button"
        onClick={() => dismiss(t.id)}
        className="opacity-60 hover:opacity-100 transition-opacity shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed top-4 right-4 z-[100] flex flex-col gap-2"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
