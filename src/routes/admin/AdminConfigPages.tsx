import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { api } from '../../api';
import type { AuditLogEntry, PriceLogEntry } from '../../api/client';
import { useStore } from '../../stores/appContext';
import { useUiStore } from '../../stores/ui';
import { formatINR } from '../../shared/money';
import { formatIstDateTimeDisplay } from '../../shared/calendar';
import type { Coupon } from '../../shared/schemas';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';

export function AdminShippingPage() {
  const { config, refreshConfig } = useStore();
  const pushToast = useUiStore((s) => s.pushToast);
  const [rates, setRates] = useState(config.shippingRates);

  useEffect(() => setRates(config.shippingRates), [config.shippingRates]);

  return (
    <div className="space-y-5 max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-[var(--ink)]">All-India Courier Weight Slabs</h1>
      <div className="space-y-3">
        {rates.map((r, i) => (
          <div key={i} className="grid grid-cols-2 sm:grid-cols-5 gap-3 rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-4 shadow-[var(--sh-1)]">
            <Input
              label="Zone Code"
              value={r.zoneCode}
              onChange={(e) => {
                const next = [...rates];
                next[i] = { ...r, zoneCode: e.target.value };
                setRates(next);
              }}
            />
            <Input
              label="Min Weight (g)"
              type="number"
              value={r.minWeightG}
              onChange={(e) => {
                const next = [...rates];
                next[i] = { ...r, minWeightG: Number(e.target.value) };
                setRates(next);
              }}
            />
            <Input
              label="Max Weight (g)"
              type="number"
              value={r.maxWeightG}
              onChange={(e) => {
                const next = [...rates];
                next[i] = { ...r, maxWeightG: Number(e.target.value) };
                setRates(next);
              }}
            />
            <Input
              label="Fee (paise)"
              type="number"
              value={r.feePaise}
              onChange={(e) => {
                const next = [...rates];
                next[i] = { ...r, feePaise: Number(e.target.value) };
                setRates(next);
              }}
            />
            <Input
              label="Free Above (paise)"
              type="number"
              value={r.freeAbovePaise ?? 0}
              onChange={(e) => {
                const next = [...rates];
                const v = Number(e.target.value);
                next[i] = { ...r, freeAbovePaise: v > 0 ? v : null };
                setRates(next);
              }}
            />
          </div>
        ))}
      </div>
      <Button
        variant="primary"
        onClick={async () => {
          await api.adminUpdateShippingRates(rates);
          await refreshConfig();
          pushToast({ message: 'Shipping slabs saved', tone: 'success' });
        }}
      >
        Save Slabs
      </Button>
    </div>
  );
}

export function AdminZonesPage() {
  const { config, refreshConfig } = useStore();
  const pushToast = useUiStore((s) => s.pushToast);
  const [zones, setZones] = useState(config.zones);

  useEffect(() => setZones(config.zones), [config.zones]);

  return (
    <div className="space-y-5 max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-[var(--ink)]">Local Delivery Pincode Zones</h1>
      <div className="space-y-3">
        {zones.map((z, i) => (
          <div key={z.id} className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-4 shadow-[var(--sh-1)] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Zone Name"
                value={z.name}
                onChange={(e) => {
                  const next = [...zones];
                  next[i] = { ...z, name: e.target.value };
                  setZones(next);
                }}
              />
              <Input
                label="Delivery Fee (paise)"
                type="number"
                value={z.feePaise}
                onChange={(e) => {
                  const next = [...zones];
                  next[i] = { ...z, feePaise: Number(e.target.value) };
                  setZones(next);
                }}
              />
              <Input
                label="Min Order (paise)"
                type="number"
                value={z.minOrderPaise}
                onChange={(e) => {
                  const next = [...zones];
                  next[i] = { ...z, minOrderPaise: Number(e.target.value) };
                  setZones(next);
                }}
              />
            </div>
            <Input
              label="Pincodes (comma-separated)"
              value={z.pincodes.join(', ')}
              onChange={(e) => {
                const next = [...zones];
                next[i] = {
                  ...z,
                  pincodes: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                };
                setZones(next);
              }}
              className="font-mono text-xs"
            />
          </div>
        ))}
      </div>
      <Button
        variant="primary"
        onClick={async () => {
          await api.adminUpdateZones(zones);
          await refreshConfig();
          pushToast({ message: 'Local zones updated', tone: 'success' });
        }}
      >
        Save Local Zones
      </Button>
    </div>
  );
}

export function AdminCouponsPage() {
  const { catalog, refreshCatalog } = useStore();
  const pushToast = useUiStore((s) => s.pushToast);
  const coupons = catalog?.coupons || [];

  const [code, setCode] = useState('');
  const [type, setType] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState(15);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const c: Coupon = {
      code: code.trim().toUpperCase(),
      type,
      value,
      maxDiscountPaise: type === 'percent' ? 20000 : null,
      minOrderPaise: 39900,
      validFromIso: '2026-01-01T00:00:00.000Z',
      validToIso: '2027-12-31T23:59:59.000Z',
      maxUses: 200,
      usedCount: 0,
      active: true,
    };
    await api.adminUpsertCoupon(c);
    await refreshCatalog();
    setCode('');
    pushToast({ message: `Saved coupon ${c.code}`, tone: 'success' });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-[var(--ink)]">Discount Coupons</h1>
      <div className="space-y-2">
        {coupons.map((c) => (
          <div key={c.code} className="flex justify-between items-center rounded-xl border border-[var(--border-soft)]/70 bg-[var(--surface)] px-4 py-3 text-sm shadow-[var(--sh-1)] tabular-nums">
            <div>
              <span className="font-mono font-bold">{c.code}</span> ·{' '}
              {c.type === 'percent' ? `${c.value}% off` : `${formatINR(c.value)} flat off`} · min{' '}
              {formatINR(c.minOrderPaise)}
            </div>
            <span className="text-xs text-[var(--ink-muted)]">Used {c.usedCount} times</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSave} className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <Input label="New Coupon Code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="DIWALI15" required />
        <Select
          label="Type"
          value={type}
          onChange={(e) => setType(e.target.value as 'percent' | 'fixed')}
          options={[
            { value: 'percent', label: 'Percent (%)' },
            { value: 'fixed', label: 'Fixed (paise)' },
          ]}
        />
        <Input label="Value" type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} required />
        <div className="sm:col-span-3">
          <Button type="submit" variant="primary" size="sm">Create Coupon</Button>
        </div>
      </form>
    </div>
  );
}

export function AdminReportsPage() {
  const [data, setData] = useState<{
    todayOrders: number;
    todayRevenuePaise: number;
    sevenDayRevenuePaise: number;
    thirtyDayRevenuePaise: number;
    topSkus: Array<{ skuCode: string; name: string; qty: number; revenuePaise: number }>;
  } | null>(null);

  useEffect(() => {
    api.adminGetReports().then(setData).catch(() => {});
  }, []);

  const maxRev = Math.max(1, ...(data?.topSkus.map((s) => s.revenuePaise) || [1]));

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-[var(--ink)]">Sales Reports</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 tabular-nums">
        <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-4 shadow-[var(--sh-1)]">
          <p className="text-xs text-[var(--ink-muted)]">Today</p>
          <p className="font-display text-2xl font-bold text-[var(--primary)]">{formatINR(data?.todayRevenuePaise ?? 0)}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-4 shadow-[var(--sh-1)]">
          <p className="text-xs text-[var(--ink-muted)]">Last 7 Days</p>
          <p className="font-display text-2xl font-bold text-[var(--primary)]">{formatINR(data?.sevenDayRevenuePaise ?? 0)}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-4 shadow-[var(--sh-1)]">
          <p className="text-xs text-[var(--ink-muted)]">Last 30 Days</p>
          <p className="font-display text-2xl font-bold text-[var(--primary)]">{formatINR(data?.thirtyDayRevenuePaise ?? 0)}</p>
        </div>
      </div>

      {/* Single-color bar chart + accessible table */}
      <section className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-4">
        <h2 className="font-display text-lg font-bold text-[var(--ink)]">Top SKUs by Revenue</h2>
        {!data || data.topSkus.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">No paid orders yet.</p>
        ) : (
          <>
            <div className="space-y-2.5" aria-hidden="true">
              {data.topSkus.map((s) => (
                <div key={s.skuCode} className="space-y-1">
                  <div className="flex justify-between text-xs tabular-nums">
                    <span className="font-semibold">{s.name}</span>
                    <span>{formatINR(s.revenuePaise)}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--primary)]"
                      style={{ width: `${Math.max(4, Math.round((s.revenuePaise / maxRev) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <table className="w-full text-sm tabular-nums border-t border-[var(--border-soft)]">
              <thead>
                <tr className="text-left text-xs text-[var(--ink-muted)] border-b border-[var(--border-soft)]">
                  <th className="py-2">SKU</th>
                  <th className="py-2 text-right">Packs Sold</th>
                  <th className="py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.topSkus.map((s) => (
                  <tr key={s.skuCode} className="border-b border-[var(--border-soft)] last:border-0">
                    <td className="py-2">{s.name} ({s.skuCode})</td>
                    <td className="py-2 text-right">{s.qty}</td>
                    <td className="py-2 text-right font-semibold">{formatINR(s.revenuePaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
    </div>
  );
}

export function AdminAuditPage() {
  const [data, setData] = useState<{ audit: AuditLogEntry[]; priceLog: PriceLogEntry[] }>({ audit: [], priceLog: [] });

  useEffect(() => {
    api.adminGetAudit().then(setData).catch(() => {});
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-[var(--ink)]">Audit &amp; Price Change Log</h1>

      <section className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-3">
        <h2 className="font-display text-lg font-bold text-[var(--ink)]">Price Change Log ({data.priceLog.length})</h2>
        {data.priceLog.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">No SKU price changes recorded yet.</p>
        ) : (
          <ul className="space-y-2 text-xs tabular-nums">
            {data.priceLog.map((p) => (
              <li key={p.id} className="flex justify-between border-b border-[var(--border-soft)] pb-1.5">
                <span className="font-mono">{p.skuCode}: {formatINR(p.oldRetailPaise)} → {formatINR(p.newRetailPaise)}</span>
                <span className="text-[var(--ink-muted)]">{p.changedBy} · {formatIstDateTimeDisplay(p.changedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-3">
        <h2 className="font-display text-lg font-bold text-[var(--ink)]">Admin Audit Trail ({data.audit.length})</h2>
        {data.audit.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">No admin audit events recorded yet.</p>
        ) : (
          <ul className="space-y-2 text-xs">
            {data.audit.map((a) => (
              <li key={a.id} className="flex justify-between gap-2 border-b border-[var(--border-soft)] pb-1.5">
                <span><strong>{a.action}</strong> ({a.entity}) — {a.summary}</span>
                <span className="text-[var(--ink-muted)] shrink-0">{formatIstDateTimeDisplay(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function AdminSettingsPage() {
  const { config, refreshConfig } = useStore();
  const pushToast = useUiStore((s) => s.pushToast);

  const [maintenance, setMaintenance] = useState(config.maintenance);
  const [waNumber, setWaNumber] = useState(config.whatsapp.number);
  const [dispatchDays, setDispatchDays] = useState(config.dispatchDays);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.adminUpdateSettings({
      maintenance,
      dispatchDays,
      whatsapp: { ...config.whatsapp, number: waNumber },
    });
    await refreshConfig();
    pushToast({ message: 'Store settings updated', tone: 'success' });
  };

  const handleBackupDownload = async () => {
    const json = await api.adminExportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `store-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast({ message: 'Downloaded full JSON store backup', tone: 'success' });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-[var(--ink)]">Store Settings &amp; Backup</h1>

      <form onSubmit={handleSave} className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-4">
        <Input label="WhatsApp Order Help Number" value={waNumber} onChange={(e) => setWaNumber(e.target.value)} />
        <Input label="Dispatch Lead Days (IST working days)" type="number" min={1} max={10} value={dispatchDays} onChange={(e) => setDispatchDays(Number(e.target.value))} />
        <label className="flex items-center gap-2.5 text-sm cursor-pointer min-h-[44px]">
          <input type="checkbox" checked={maintenance} onChange={(e) => setMaintenance(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
          <span>Enable maintenance mode on customer routes</span>
        </label>
        <Button type="submit" variant="primary">Save Settings</Button>
      </form>

      <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold">Full Store Data Export</p>
          <p className="text-xs text-[var(--ink-muted)]">Downloads products, SKUs, coupons, buyers, orders, and audit logs as JSON.</p>
        </div>
        <Button variant="secondary" onClick={handleBackupDownload}>
          <Download className="h-4 w-4" aria-hidden="true" /> Export JSON Backup
        </Button>
      </div>
    </div>
  );
}
