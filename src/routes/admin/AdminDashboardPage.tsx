import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Volume2, Smartphone, ClipboardList } from 'lucide-react';
import { api } from '../../api';
import { useStore } from '../../stores/appContext';
import { formatINR } from '../../shared/money';
import { Button } from '../../components/ui/Button';
import { useUiStore } from '../../stores/ui';

export function AdminDashboardPage() {
  const { config, catalog, refreshConfig } = useStore();
  const pushToast = useUiStore((s) => s.pushToast);

  const [reports, setReports] = useState<{
    todayOrders: number;
    todayRevenuePaise: number;
    sevenDayRevenuePaise: number;
    thirtyDayRevenuePaise: number;
    topSkus: Array<{ skuCode: string; name: string; qty: number; revenuePaise: number }>;
  } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [wakeActive, setWakeActive] = useState(false);
  const wakeRef = useRef<{ release: () => Promise<void> } | null>(null);

  useEffect(() => {
    api.adminGetReports().then(setReports).catch(() => {});
    return () => {
      void wakeRef.current?.release();
    };
  }, []);

  const lowStockSkus =
    catalog?.skus.filter((s) => s.status === 'active' && s.stockQty <= s.lowStockAt) || [];

  const handleEnableSound = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 660;
      gain.gain.value = 0.04;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
      setSoundEnabled(true);
      pushToast({ message: 'Kitchen chime enabled for new orders.', tone: 'success' });
    } catch {
      pushToast({ message: 'Audio alerts blocked by browser.', tone: 'info' });
    }
  };

  const handleToggleWakeLock = async () => {
    if (wakeActive && wakeRef.current) {
      await wakeRef.current.release();
      wakeRef.current = null;
      setWakeActive(false);
      return;
    }
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } };
      if (!nav.wakeLock) {
        pushToast({ message: 'Screen Wake Lock not supported on this browser.', tone: 'info' });
        return;
      }
      wakeRef.current = await nav.wakeLock.request('screen');
      setWakeActive(true);
    } catch {
      pushToast({ message: 'Unable to keep screen awake.', tone: 'info' });
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--ink)]">Kitchen &amp; Dispatch Dashboard</h1>
          <p className="text-sm text-[var(--ink-muted)]">
            Shop status: <strong className="uppercase">{config.manualShopStatus}</strong>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant={soundEnabled ? 'primary' : 'secondary'} size="sm" onClick={handleEnableSound}>
            <Volume2 className="h-4 w-4" aria-hidden="true" />
            <span>{soundEnabled ? 'Sound On' : 'Enable sound'}</span>
          </Button>
          <Button variant={wakeActive ? 'primary' : 'secondary'} size="sm" onClick={handleToggleWakeLock}>
            <Smartphone className="h-4 w-4" aria-hidden="true" />
            <span>{wakeActive ? 'Screen Awake' : 'Keep screen awake'}</span>
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
        <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-4 shadow-[var(--sh-1)]">
          <p className="text-xs text-[var(--ink-muted)]">Today&apos;s Orders</p>
          <p className="font-display text-2xl font-bold text-[var(--primary)] mt-1">{reports?.todayOrders ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-4 shadow-[var(--sh-1)]">
          <p className="text-xs text-[var(--ink-muted)]">Today&apos;s Revenue</p>
          <p className="font-display text-2xl font-bold text-[var(--primary)] mt-1">{formatINR(reports?.todayRevenuePaise ?? 0)}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-4 shadow-[var(--sh-1)]">
          <p className="text-xs text-[var(--ink-muted)]">7-Day Revenue</p>
          <p className="font-display text-2xl font-bold text-[var(--primary)] mt-1">{formatINR(reports?.sevenDayRevenuePaise ?? 0)}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-4 shadow-[var(--sh-1)]">
          <p className="text-xs text-[var(--ink-muted)]">30-Day Revenue</p>
          <p className="font-display text-2xl font-bold text-[var(--primary)] mt-1">{formatINR(reports?.thirtyDayRevenuePaise ?? 0)}</p>
        </div>
      </div>

      {/* Quick Shop Switch */}
      <section className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-3">
        <h2 className="font-display text-base font-bold text-[var(--ink)]">Kitchen &amp; Dispatch Switch</h2>
        <div className="flex flex-wrap gap-2">
          {(['open', 'busy', 'closed'] as const).map((s) => (
            <Button
              key={s}
              variant={config.manualShopStatus === s ? 'primary' : 'secondary'}
              size="sm"
              onClick={async () => {
                await api.adminSetShopSwitch(s, s === 'busy' ? 30 : undefined);
                await refreshConfig();
                pushToast({ message: `Shop switched to ${s.toUpperCase()}`, tone: 'success' });
              }}
            >
              Set {s.toUpperCase()}
            </Button>
          ))}
        </div>
      </section>

      {/* Low stock alerts */}
      <section className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-[var(--ink)] flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[var(--warn-ink)]" aria-hidden="true" />
            <span>Low &amp; out-of-stock packs ({lowStockSkus.length})</span>
          </h2>
          <Link to="/admin/products" className="text-xs font-semibold text-[var(--primary)] hover:underline">
            Manage SKUs
          </Link>
        </div>
        {lowStockSkus.length === 0 ? (
          <p className="rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-border)] px-3.5 py-2.5 text-xs font-medium text-[var(--on-secondary-fixed)]">
            All active SKUs are comfortably stocked.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm tabular-nums">
            {lowStockSkus.map((s) => (
              <div key={s.id} className="flex justify-between rounded-xl bg-[var(--surface-2)] px-3 py-2">
                <span className="font-mono text-xs font-semibold">{s.skuCode} ({s.packLabel})</span>
                <span className={s.stockQty === 0 ? 'font-bold text-[var(--danger)]' : 'font-semibold text-[var(--warn-ink)]'}>
                  {s.stockQty} left
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex gap-3">
        <Link to="/admin/orders" className="pressable inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] px-5 text-sm font-semibold text-white transition-colors">
          <ClipboardList className="h-4 w-4" aria-hidden="true" />
          <span>Open Live Order Queue</span>
        </Link>
      </div>
    </div>
  );
}
