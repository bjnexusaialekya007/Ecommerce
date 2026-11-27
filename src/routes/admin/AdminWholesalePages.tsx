import { useEffect, useState } from 'react';
import { api } from '../../api';
import type { WholesaleQuoteRequest } from '../../api/client';
import type { Customer } from '../../shared/schemas';
import { useUiStore } from '../../stores/ui';
import { StatusPill } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export function AdminWholesaleBuyersPage() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [buyers, setBuyers] = useState<Customer[]>([]);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  useEffect(() => {
    api.adminGetBuyers().then(setBuyers).catch(() => {});
  }, []);

  return (
    <div className="space-y-5 max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-[var(--ink)]">Wholesale Buyers ({buyers.length})</h1>

      <div className="space-y-3">
        {buyers.map((b) => (
          <div key={b.id} className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-bold text-lg text-[var(--ink)]">{b.businessName || b.name}</p>
                <p className="text-xs text-[var(--ink-muted)] font-mono">
                  {b.name} · {b.phone} · {b.email} · GSTIN: {b.gstin || '—'}
                </p>
                {b.address && <p className="text-xs text-[var(--ink-muted)] mt-0.5">{b.address}</p>}
              </div>
              <StatusPill
                label={b.wholesaleStatus || 'pending'}
                tone={b.wholesaleStatus === 'approved' ? 'ok' : b.wholesaleStatus === 'rejected' ? 'danger' : 'warn'}
              />
            </div>

            {b.wholesaleStatus !== 'approved' && (
              <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-[var(--border-soft)]">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={async () => {
                    const updated = await api.adminApproveBuyer(b.id);
                    setBuyers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
                    pushToast({ message: `Approved ${b.businessName || b.name}`, tone: 'success' });
                  }}
                >
                  Approve Buyer
                </Button>
                <div className="flex-1 min-w-[200px]">
                  <Input
                    label="Rejection reason (if rejecting)"
                    value={rejectReason[b.id] || ''}
                    onChange={(e) => setRejectReason({ ...rejectReason, [b.id]: e.target.value })}
                    placeholder="e.g. Inactive GSTIN"
                  />
                </div>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={async () => {
                    const updated = await api.adminRejectBuyer(b.id, rejectReason[b.id] || 'GST verification declined');
                    setBuyers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
                    pushToast({ message: `Rejected ${b.businessName || b.name}`, tone: 'info' });
                  }}
                >
                  Reject
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminWholesaleQuotesPage() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [quotes, setQuotes] = useState<WholesaleQuoteRequest[]>([]);
  const [replies, setReplies] = useState<Record<string, string>>({});

  useEffect(() => {
    api.adminGetQuotes().then(setQuotes).catch(() => {});
  }, []);

  return (
    <div className="space-y-5 max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-[var(--ink)]">Bulk Quote Requests ({quotes.length})</h1>

      {quotes.length === 0 ? (
        <p className="rounded-xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 text-sm text-[var(--ink-muted)] shadow-[var(--sh-1)]">
          No quote requests yet.
        </p>
      ) : (
        <div className="space-y-3">
          {quotes.map((q) => (
            <div key={q.id} className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="font-bold text-[var(--ink)]">{q.name} · {q.phone}</p>
                  <p className="text-xs text-[var(--ink-muted)]">{q.message}</p>
                </div>
                <StatusPill label={q.status} tone={q.status === 'replied' ? 'ok' : 'neutral'} />
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[220px]">
                  <Input
                    label="Desk Reply / Pricing Note"
                    value={replies[q.id] ?? q.replyNote}
                    onChange={(e) => setReplies({ ...replies, [q.id]: e.target.value })}
                  />
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={async () => {
                    const updated = await api.adminUpdateQuote(q.id, 'replied', replies[q.id] ?? q.replyNote);
                    setQuotes((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
                    pushToast({ message: 'Quote updated', tone: 'success' });
                  }}
                >
                  Mark Replied
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
