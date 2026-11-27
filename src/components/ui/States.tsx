import React from 'react';
import { AlertCircle, PackageOpen, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from './Button';

export function Skeleton({ className = 'h-6 w-full rounded-lg' }: { className?: string }) {
  return <div className={`skel ${className}`} aria-hidden="true" />;
}

export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-3 shadow-[var(--sh-1)] space-y-3">
          <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  message?: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const copy = message ?? body ?? '';
  return (
    <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-8 shadow-[var(--sh-1)] text-center space-y-3">
      <PackageOpen className="h-8 w-8 mx-auto text-[var(--primary)]" aria-hidden="true" />
      <h2 className="font-display text-xl font-bold text-[var(--ink)]">{title}</h2>
      {copy && <p className="text-sm text-[var(--ink-muted)] max-w-md mx-auto">{copy}</p>}
      {actionLabel && onAction && (
        <div className="pt-2">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      )}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  extra,
}: {
  message: string;
  onRetry?: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div role="alert" className="rounded-2xl border border-[var(--danger)]/40 bg-[var(--surface)] p-6 shadow-[var(--sh-1)] space-y-3">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-[var(--danger)] shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <h2 className="font-display text-base font-bold text-[var(--ink)]">Could not load this section</h2>
          <p className="text-sm text-[var(--ink-muted)]">{message}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
        )}
        {extra}
      </div>
    </div>
  );
}

export function Banner({
  tone = 'warn',
  children,
  onDismiss,
}: {
  tone?: 'warn' | 'danger' | 'info';
  children: React.ReactNode;
  onDismiss?: () => void;
}) {
  const style =
    tone === 'danger'
      ? 'bg-[var(--danger)] text-white'
      : tone === 'info'
      ? 'bg-[var(--surface-2)] text-[var(--ink)] border-b border-[var(--border-soft)]'
      : 'bg-[var(--warn-bg)] text-[var(--warn-ink)] border-b border-[var(--border-soft)]';

  return (
    <div className={`px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-center gap-3 ${style}`}>
      <div className="flex items-center gap-2 text-center">{children}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss announcement"
          className="underline text-xs shrink-0 px-1 py-0.5"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

export function OfflineBanner({ phone }: { phone: string }) {
  return (
    <div role="status" className="bg-[var(--ink)] text-white px-4 py-2.5 text-xs sm:text-sm flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        You are offline. Call us on <a href={`tel:${phone.replace(/\s+/g, '')}`} className="underline font-bold">{phone}</a> to place an order.
      </span>
    </div>
  );
}
