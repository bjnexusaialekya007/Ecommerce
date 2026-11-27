import { CheckCircle2, Clock, Package, Truck, XCircle, AlertTriangle } from 'lucide-react';
import { getStatusLabel, type OrderStatus } from '../../shared/status';
import type { FulfilmentMode } from '../../shared/schemas';

export type StatusPillProps =
  | { status: OrderStatus; mode: FulfilmentMode; label?: never; tone?: never }
  | { label: string; tone?: 'ok' | 'warn' | 'danger' | 'neutral'; status?: never; mode?: never };

export function StatusPill(props: StatusPillProps) {
  let label: string;
  let toneClass = 'bg-[var(--surface-2)] text-[var(--ink)] border-[var(--border-soft)]';
  let Icon = Clock;

  if (props.status && props.mode) {
    label = getStatusLabel(props.status, props.mode);
    if (props.status === 'paid' || props.status === 'delivered') {
      toneClass = 'bg-[var(--accent-soft)] text-[var(--on-secondary-fixed)] border-[var(--accent-border)]';
      Icon = CheckCircle2;
    } else if (props.status === 'packed') {
      toneClass = 'bg-[var(--surface-2)] text-[var(--ink)] border-[var(--border-soft)]';
      Icon = Package;
    } else if (props.status === 'shipped') {
      toneClass = 'bg-[var(--primary)] text-white border-transparent';
      Icon = Truck;
    } else if (props.status === 'cancelled' || props.status === 'expired') {
      toneClass = 'bg-[var(--danger-bg)] text-[var(--danger-ink)] border-transparent';
      Icon = XCircle;
    } else if (props.status === 'refunded' || props.status === 'pending_payment') {
      toneClass = 'bg-[var(--warn-bg)] text-[var(--warn-ink)] border-transparent';
      Icon = AlertTriangle;
    }
  } else {
    label = props.label || '';
    const t = props.tone || 'neutral';
    if (t === 'ok') {
      toneClass = 'bg-[var(--accent-soft)] text-[var(--on-secondary-fixed)] border-[var(--accent-border)]';
      Icon = CheckCircle2;
    } else if (t === 'danger') {
      toneClass = 'bg-[var(--danger-bg)] text-[var(--danger-ink)] border-transparent';
      Icon = XCircle;
    } else if (t === 'warn') {
      toneClass = 'bg-[var(--warn-bg)] text-[var(--warn-ink)] border-transparent';
      Icon = AlertTriangle;
    }
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap ${toneClass}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export function StockNotice({
  stockQty,
  lowStockAt,
  lowThreshold,
}: {
  stockQty: number;
  lowStockAt?: number;
  lowThreshold?: number;
}) {
  const threshold = lowStockAt ?? lowThreshold ?? 5;
  if (stockQty === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--danger)]">
        <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
        Sold out
      </span>
    );
  }
  if (stockQty <= threshold) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--warn-ink)]">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
        Only {stockQty} left
      </span>
    );
  }
  return null;
}
