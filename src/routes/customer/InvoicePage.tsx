import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { api } from '../../api';
import type { OrderRecord } from '../../api/client';
import { formatINR } from '../../shared/money';
import { INDIAN_STATES } from '../../shared/constants';
import { formatIstDateTimeDisplay } from '../../shared/calendar';
import { formatAddress } from '../../shared/address';
import { useStore } from '../../stores/appContext';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/States';

export function InvoicePage() {
  const { code = '' } = useParams<{ code: string }>();
  const [params] = useSearchParams();
  const token = params.get('t') || '';
  const { config } = useStore();

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getOrderByInvoiceToken(code.toUpperCase(), token)
      .then(setOrder)
      .catch((err) => setError(err instanceof Error ? err.message : 'Invalid or expired invoice link.'))
      .finally(() => setLoading(false));
  }, [code, token]);

  if (loading) {
    return <div className="mx-auto max-w-4xl px-4 py-12 text-sm text-[var(--ink-muted)]">Loading GST Tax Invoice…</div>;
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState title="Invoice unavailable" body={error || 'Invalid invoice link.'} />
      </div>
    );
  }

  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        <div className="no-print flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold text-[var(--ink)]">GST Tax Invoice</h1>
          <Button variant="primary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            <span>Print / Save PDF</span>
          </Button>
        </div>

        <article className="rounded-2xl border border-[var(--border-soft)]/70 bg-white p-6 sm:p-8 text-[var(--ink)] shadow-[var(--sh-1)] space-y-6">
          <header className="flex flex-col sm:flex-row justify-between gap-4 border-b border-[var(--border-soft)] pb-4">
            <div className="space-y-1">
              <p className="font-display text-xl font-bold text-[var(--primary)]">{config.legal.legalName}</p>
              <p className="text-xs text-[var(--ink-muted)]">{formatAddress(config)}</p>
              <p className="text-xs font-mono">GSTIN: {config.legal.gstin} · FSSAI: {config.legal.fssai}</p>
              <p className="text-xs">State: {config.legal.stateCode} · {INDIAN_STATES[config.legal.stateCode] || config.contact.addressParts.state}</p>
            </div>
            <div className="sm:text-right text-xs space-y-1 tabular-nums">
              <p className="text-base font-bold uppercase tracking-wide text-[var(--primary)]">Tax Invoice</p>
              <p>Invoice No: <strong className="font-mono">{order.invoiceNo || `DRAFT-${order.publicCode}`}</strong></p>
              <p>Order Code: <strong className="font-mono">{order.publicCode}</strong></p>
              <p>Date: {formatIstDateTimeDisplay(order.createdAt)}</p>
            </div>
          </header>

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <p className="font-bold uppercase text-[var(--ink-muted)]">Billed / Shipped To</p>
              <p className="text-sm font-semibold">{order.businessName || order.customerName}</p>
              {order.businessName && <p>Attn: {order.customerName}</p>}
              <p>{order.addressSummary}</p>
              <p>Phone: {order.phone}</p>
              {order.gstin && <p className="font-mono">Buyer GSTIN: {order.gstin}</p>}
            </div>
            <div className="space-y-1 sm:text-right">
              <p className="font-bold uppercase text-[var(--ink-muted)]">Supply Details</p>
              <p>
                Place of Supply: {order.placeOfSupplyState} · {INDIAN_STATES[order.placeOfSupplyState] || 'India'}
              </p>
              <p>Tax Regime: {order.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}</p>
              <p>Payment: {order.paymentMethod.toUpperCase()} ({order.paymentStatus})</p>
            </div>
          </section>

          <div className="overflow-x-auto">
            <table className="w-full text-xs tabular-nums border-collapse">
              <thead>
                <tr className="border-y border-[var(--border-soft)] text-left bg-[var(--surface-2)] text-[var(--ink-muted)]">
                  <th className="py-2 px-2">Item &amp; SKU</th>
                  <th className="py-2 px-2">HSN</th>
                  <th className="py-2 px-2 text-right">Qty</th>
                  <th className="py-2 px-2 text-right">Rate</th>
                  <th className="py-2 px-2 text-right">Taxable</th>
                  <th className="py-2 px-2 text-right">GST %</th>
                  <th className="py-2 px-2 text-right">{order.isInterState ? 'IGST' : 'CGST+SGST'}</th>
                  <th className="py-2 px-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.skuId} className="border-b border-[var(--border-soft)]/70">
                    <td className="py-2 px-2">
                      <span className="font-semibold">{item.name}</span>
                      <span className="block text-[10px] text-[var(--ink-muted)] font-mono">{item.skuCode}</span>
                    </td>
                    <td className="py-2 px-2 font-mono">{item.hsnCode}</td>
                    <td className="py-2 px-2 text-right">{item.qty}</td>
                    <td className="py-2 px-2 text-right">{formatINR(item.unitPaise)}</td>
                    <td className="py-2 px-2 text-right">{formatINR(item.taxableValue)}</td>
                    <td className="py-2 px-2 text-right">{item.gstRate}%</td>
                    <td className="py-2 px-2 text-right">
                      {order.isInterState ? formatINR(item.igst) : `${formatINR(item.cgst)} + ${formatINR(item.sgst)}`}
                    </td>
                    <td className="py-2 px-2 text-right font-semibold">{formatINR(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="flex flex-col sm:flex-row justify-between gap-4 border-t border-[var(--border-soft)] pt-4 text-xs">
            <div className="text-[var(--ink-muted)] max-w-sm space-y-1">
              <p>Certified that the particulars given above are true and correct. Food items once opened cannot be returned.</p>
              <p>Computer-generated tax invoice — no signature required.</p>
            </div>
            <dl className="w-full sm:w-64 space-y-1 tabular-nums text-sm">
              <div className="flex justify-between">
                <dt>Subtotal:</dt>
                <dd>{formatINR(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <dt>Discount:</dt>
                  <dd>−{formatINR(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt>Shipping:</dt>
                <dd>{formatINR(order.shipping)}</dd>
              </div>
              <div className="flex justify-between text-xs text-[var(--ink-muted)]">
                <dt>Total GST:</dt>
                <dd>{formatINR(order.tax)}</dd>
              </div>
              <div className="flex justify-between border-t border-[var(--border-soft)] pt-1.5 font-bold text-base text-[var(--primary)]">
                <dt>Invoice Total:</dt>
                <dd>{formatINR(order.total)}</dd>
              </div>
            </dl>
          </footer>
        </article>
      </div>
    </>
  );
}
