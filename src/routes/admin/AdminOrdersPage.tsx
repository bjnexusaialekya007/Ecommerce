import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, Printer, RefreshCw, Truck, Mail } from 'lucide-react';
import { api } from '../../api';
import type { OrderRecord } from '../../api/client';
import { formatINR } from '../../shared/money';
import { formatIstDateTimeDisplay } from '../../shared/calendar';
import { getStatusLabel, LEGAL_STATUS_TRANSITIONS, type OrderStatus } from '../../shared/status';
import { useUiStore } from '../../stores/ui';
import { StatusPill } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

function printMode(mode: 'picklist' | 'label' | 'slip') {
  document.documentElement.setAttribute('data-print', mode);
  window.print();
  window.setTimeout(() => document.documentElement.removeAttribute('data-print'), 500);
}

export function AdminOrdersPage() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    const list = await api.adminGetOrders(statusFilter === 'all' ? undefined : statusFilter);
    setOrders(list);
    if (!selectedId && list.length > 0) setSelectedId(list[0].id);
  };

  useEffect(() => {
    void load();
    // 25s polling paused when tab is hidden (Section K6)
    const id = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 25000);
    return () => window.clearInterval(id);
  }, [statusFilter]);

  const exportCsv = () => {
    const headers = ['Code', 'Created', 'Customer', 'Phone', 'Mode', 'Status', 'TotalINR', 'Tracking'];
    const rows = orders.map((o) => [
      o.publicCode,
      o.createdAt,
      o.customerName,
      o.phone,
      o.mode,
      o.status,
      (o.total / 100).toFixed(2),
      o.trackingId || '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast({ message: 'Exported filtered orders CSV', tone: 'success' });
  };

  const selected = orders.find((o) => o.id === selectedId) || orders[0] || null;

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-[var(--ink)]">Orders ({orders.length})</h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
          <Button variant="secondary" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="no-print flex flex-wrap gap-1.5">
        {['all', 'pending_payment', 'paid', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`min-h-[38px] rounded-full border px-3.5 text-xs font-semibold capitalize transition-colors ${
              statusFilter === st
                ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-[var(--sh-1)]'
                : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink)] hover:bg-[var(--surface-high)]'
            }`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Master List */}
        <div className="no-print lg:col-span-5 space-y-2">
          {orders.length === 0 ? (
            <p className="rounded-xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 text-sm text-[var(--ink-muted)] shadow-[var(--sh-1)]">
              No orders in this filter yet. Place a test order from Checkout to watch it appear here.
            </p>
          ) : (
            orders.map((ord) => (
              <div
                key={ord.id}
                onClick={() => setSelectedId(ord.id)}
                className={`cursor-pointer rounded-2xl border p-3.5 shadow-[var(--sh-1)] transition-colors ${
                  selected?.id === ord.id
                    ? 'border-[var(--primary)] bg-[var(--surface-2)]'
                    : 'border-[var(--border-soft)]/70 bg-[var(--surface)] hover:bg-[var(--surface-2)]/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-sm text-[var(--ink)]">{ord.publicCode}</span>
                  <StatusPill
                    label={getStatusLabel(ord.status, ord.mode)}
                    tone={ord.status === 'delivered' ? 'ok' : ord.amountMismatchFlag ? 'warn' : 'neutral'}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-[var(--ink-muted)] tabular-nums">
                  <span>{ord.customerName} · {ord.mode}</span>
                  <span className="font-semibold text-[var(--ink)]">{formatINR(ord.total)}</span>
                </div>
                <div className="mt-2 flex gap-2 lg:hidden">
                  <Link to={`/admin/orders/${ord.id}`} className="text-xs font-semibold text-[var(--primary)] underline">
                    Open details
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Master-Detail Inspector */}
        <div className="lg:col-span-7">
          {selected && (
            <AdminOrderDetailCard
              order={selected}
              onUpdated={(updated) => setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminOrderDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderRecord | null>(null);

  useEffect(() => {
    api.adminGetOrder(id).then(setOrder).catch(() => {});
  }, [id]);

  if (!order) return <p className="text-sm text-[var(--ink-muted)]">Loading order…</p>;
  return <AdminOrderDetailCard order={order} onUpdated={setOrder} />;
}

function AdminOrderDetailCard({
  order,
  onUpdated,
}: {
  order: OrderRecord;
  onUpdated: (o: OrderRecord) => void;
}) {
  const pushToast = useUiStore((s) => s.pushToast);
  const [courierName, setCourierName] = useState(order.courierName || 'DTDC Express');
  const [trackingId, setTrackingId] = useState(order.trackingId || '');
  const [trackingUrl, setTrackingUrl] = useState(order.trackingUrl || '');

  const nextStatuses = LEGAL_STATUS_TRANSITIONS[order.status] || [];

  const transition = async (next: OrderStatus) => {
    try {
      const updated = await api.adminTransitionOrder(order.id, next);
      onUpdated(updated);
      pushToast({ message: `Order moved to ${next}`, tone: 'success' });
    } catch (err) {
      pushToast({ message: err instanceof Error ? err.message : 'Transition blocked', tone: 'danger' });
    }
  };

  const handleMarkShipped = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingId.trim()) {
      pushToast({ message: 'Enter courier AWB tracking ID.', tone: 'danger' });
      return;
    }
    const updated = await api.adminMarkShipped(order.id, {
      courierName,
      trackingId: trackingId.trim(),
      trackingUrl: trackingUrl.trim() || undefined,
    });
    onUpdated(updated);
    pushToast({ message: 'Marked shipped & queued tracking email', tone: 'success' });
  };

  return (
    <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold font-mono text-[var(--primary)]">{order.publicCode}</h2>
          <p className="text-xs text-[var(--ink-muted)]">
            {order.customerName} · {order.phone} · {formatIstDateTimeDisplay(order.createdAt)}
          </p>
          <p className="text-xs text-[var(--ink-muted)] mt-0.5">{order.addressSummary}</p>
        </div>
        <div className="no-print flex flex-wrap gap-1.5">
          <Button variant="secondary" size="sm" onClick={() => printMode('picklist')}>
            <Printer className="h-3.5 w-3.5" aria-hidden="true" /> Pick list
          </Button>
          <Button variant="secondary" size="sm" onClick={() => printMode('label')}>
            <Printer className="h-3.5 w-3.5" aria-hidden="true" /> 4×6 Label
          </Button>
          <Button variant="secondary" size="sm" onClick={() => printMode('slip')}>
            <Printer className="h-3.5 w-3.5" aria-hidden="true" /> 80mm Slip
          </Button>
        </div>
      </div>

      {/* Items */}
      <table className="w-full text-sm tabular-nums border-y border-[var(--border-soft)]">
        <thead>
          <tr className="text-left text-xs text-[var(--ink-muted)] border-b border-[var(--border-soft)]">
            <th className="py-2">SKU &amp; Pack</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Line</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i) => (
            <tr key={i.skuId} className="border-b border-[var(--border-soft)] last:border-0">
              <td className="py-2">
                <span className="font-semibold">{i.name}</span>
                <span className="block text-xs font-mono text-[var(--ink-muted)]">{i.skuCode}</span>
              </td>
              <td className="py-2 text-right font-bold">{i.qty}</td>
              <td className="py-2 text-right">{formatINR(i.unitPaise * i.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mismatch / Refund notice */}
      {order.amountMismatchFlag && (
        <div className="no-print rounded-xl bg-[var(--warn-bg)] p-3 flex items-center justify-between gap-2 text-xs text-[var(--warn-ink)]">
          <span>Payment amount mismatch flagged.</span>
          <Button
            size="sm"
            variant="primary"
            onClick={async () => {
              const updated = await api.adminResolveMismatch(order.id);
              onUpdated(updated);
              pushToast({ message: 'Mismatch resolved', tone: 'success' });
            }}
          >
            Resolve mismatch
          </Button>
        </div>
      )}

      {order.status === 'refunded' && (
        <p className="rounded-xl bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--ink-muted)]">
          Refunded — GST Credit Note workflow reserved for Phase 2 tally export.
        </p>
      )}

      {/* Transition Buttons */}
      <div className="no-print space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">Order transitions</p>
        <div className="flex flex-wrap gap-2">
          {nextStatuses.map((st) => (
            <Button key={st} size="sm" variant={st === 'cancelled' || st === 'refunded' ? 'danger' : 'primary'} onClick={() => transition(st)}>
              Mark {st.replace('_', ' ')}
            </Button>
          ))}
        </div>
      </div>

      {/* Ship Form */}
      {(order.status === 'packed' || order.status === 'shipped') && (
        <form onSubmit={handleMarkShipped} className="no-print rounded-xl bg-[var(--surface-2)] p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink)] flex items-center gap-1.5">
            <Truck className="h-4 w-4" aria-hidden="true" /> Dispatch &amp; Tracking
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input label="Courier" value={courierName} onChange={(e) => setCourierName(e.target.value)} />
            <Input label="AWB Number" value={trackingId} onChange={(e) => setTrackingId(e.target.value)} />
            <Input label="Tracking URL" value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} />
          </div>
          <Button type="submit" variant="primary" size="sm">
            Save tracking &amp; mark shipped
          </Button>
        </form>
      )}

      {/* Email log & Retry */}
      <div className="no-print space-y-2 border-t border-[var(--border-soft)] pt-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)] flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" aria-hidden="true" /> Notification Log
          </p>
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              const updated = await api.adminRetryEmail(order.id);
              onUpdated(updated);
              pushToast({ message: 'Retried customer email notification', tone: 'info' });
            }}
          >
            Retry email
          </Button>
        </div>
        {order.emailLog.length === 0 ? (
          <p className="text-xs text-[var(--ink-muted)]">No notifications recorded.</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {order.emailLog.map((e) => (
              <li key={e.id} className="flex justify-between">
                <span>{e.subject}</span>
                <span className={e.status === 'failed' ? 'text-[var(--danger)] font-bold' : 'text-[var(--success)]'}>
                  {e.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
