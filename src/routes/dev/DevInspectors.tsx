import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../stores/appContext';
import { useDevSimStore } from '../../dev/simStore';
import { useOutboxStore } from '../../dev/outboxStore';
import { useAnalyticsDebugStore } from '../../analytics/track';
import { renderSeo, type SeoRouteKey } from '../../seo/render';
import { runAllQuoteCases } from '../../shared/quoteCases';
import { formatINR } from '../../shared/money';
import { experienceTelemetry } from '../../experience/ExperienceHost';
import { useExperience } from '../../experience';
import { flyToCart } from '../../experience/tier0/FlyToCart';
import { clearPrefetchLog, getPrefetchLog, PrefetchLink } from '../../experience/tier0/PrefetchLink';
import { triggerHaptic } from '../../experience/tier0/haptics';
import { navigateWithTransition } from '../../experience/tier0/transitions';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { VegMark } from '../../components/ui/VegMark';
import { StatusPill, StockNotice } from '../../components/ui/Badge';
import { Stepper } from '../../components/ui/Stepper';
import { PriceBlock } from '../../components/ui/PriceBlock';
import { SkuChips } from '../../components/ui/SkuChips';
import { ContactActions } from '../../components/ui/ContactActions';
import { SEED_SKUS } from '../../api/mock/seed';

export function StyleguidePage() {
  const { config } = useStore();
  const [chipId, setChipId] = useState(SEED_SKUS[0].id);
  const [qty, setQty] = useState(2);

  const tokens = [
    ['--bg', 'Almond Muslin Canvas (#F7F4EE)'],
    ['--surface', 'Crisp Card Surface (#FFFFFF)'],
    ['--surface-2', 'Warm Oat Surface (#EFE9DE)'],
    ['--ink', 'Espresso Roast Ink (#241C1A)'],
    ['--ink-muted', 'Warm Stone Muted (#6E5F5A)'],
    ['--primary', 'Cardamom Bronze (#8F4F24)'],
    ['--primary-hover', 'Burnt Cardamom Hover (#753F1B)'],
    ['--accent', 'Botanical Pistachio (#4D6B53)'],
    ['--accent-soft', 'Pistachio Milk (#E0EBE2)'],
    ['--border', 'Warm Input Border (#DCD4C7)'],
    ['--border-soft', 'Card Hairline (#EBE5DB)'],
    ['--veg', 'FSSAI Veg Green (#0F8A3C)'],
    ['--danger', 'Danger Crimson (#B42318)'],
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-10">
      <meta name="robots" content="noindex, nofollow" />
      <header>
        <p className="font-mono text-xs uppercase tracking-wider text-[var(--accent)]">DEV STYLEGUIDE</p>
        <h1 className="font-display text-3xl font-bold text-[var(--ink)]">Design Tokens &amp; UI Primitives</h1>
      </header>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold text-[var(--ink)]">Color Palette</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {tokens.map(([cssVar, label]) => (
            <div key={cssVar} className="rounded-xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-3 shadow-[var(--sh-1)] space-y-2">
              <div className="h-12 rounded-lg border border-black/10" style={{ backgroundColor: `var(${cssVar})` }} />
              <p className="text-xs font-bold">{label}</p>
              <p className="font-mono text-[11px] text-[var(--ink-muted)]">{cssVar}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold text-[var(--ink)]">Typography Scale (EN &amp; తెలుగు)</h2>
        <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-3">
          <p className="font-display text-4xl font-bold text-[var(--ink)]">Fraunces Display Headline · ₹220</p>
          <p className="font-sans text-base">DM Sans Body Copy · Fresh batches packed daily in Hyderabad.</p>
          <p className="font-sans text-base">తెలుగు నమూనా · తాజాగా వేయించిన బికనేరీ భుజియా మరియు రత్లామీ సేవ్.</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[var(--ink)]">Primitives &amp; Controls</h2>
        <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-5">
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Primary Action</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="primary" loading>Loading</Button>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <VegMark veg />
            <VegMark veg={false} />
            <StatusPill label="Packed" tone="ok" />
            <StatusPill label="Awaiting Payment" tone="warn" />
            <StockNotice stockQty={3} lowThreshold={5} />
            <StockNotice stockQty={0} lowThreshold={5} />
          </div>
          <SkuChips skus={SEED_SKUS.slice(0, 3)} selectedSkuId={chipId} onSelect={setChipId} />
          <div className="flex flex-wrap items-center gap-6">
            <PriceBlock pricePaise={9500} mrpPaise={11000} />
            <Stepper qty={qty} itemName="Sample" onChange={setQty} />
          </div>
          <ContactActions config={config} context="styleguide" />
        </div>
      </section>
    </div>
  );
}

export function SimPage() {
  const sim = useDevSimStore();
  const toggles: Array<[keyof typeof sim, string]> = [
    ['stockRace', 'Stock race (last pack vanishes before confirm)'],
    ['priceChange', 'Price changes mid-checkout'],
    ['shopCloseMidCheckout', 'Shop closes mid-checkout'],
    ['webhookDuplicate', 'Duplicate Razorpay webhook'],
    ['amountMismatch', 'Amount mismatch flagged'],
    ['paymentFail', 'Payment gateway decline'],
    ['emailFail', 'Email provider failure'],
    ['sessionExpired', 'Admin / Buyer session expired'],
    ['offline', 'Simulate network offline'],
    ['storageBlocked', 'Simulate localStorage blocked'],
    ['gpsDenied', 'Simulate geolocation denied'],
    ['slowImages', 'Delay images 1.8s'],
    ['staleCatalog', 'Simulate stale catalog cache'],
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <meta name="robots" content="noindex, nofollow" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-[var(--accent)]">DEV CHAOS SIMULATOR</p>
          <h1 className="font-display text-3xl font-bold text-[var(--ink)]">Mock Failure &amp; Latency Controls</h1>
        </div>
        <Button variant="secondary" onClick={sim.resetSim}>
          Reset all
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
        <Input
          label="Min Latency (ms)"
          type="number"
          value={sim.latencyMinMs}
          onChange={(e) => sim.setSim({ latencyMinMs: Number(e.target.value) })}
        />
        <Input
          label="Webhook Late Delay (sec)"
          type="number"
          value={sim.webhookLateSec}
          onChange={(e) => sim.setSim({ webhookLateSec: Number(e.target.value) })}
        />
        <Input
          label="API Fail Rate (%)"
          type="number"
          min={0}
          max={100}
          value={sim.failRatePct}
          onChange={(e) => sim.setSim({ failRatePct: Number(e.target.value) })}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {toggles.map(([key, label]) => (
          <label
            key={String(key)}
            className="flex items-center gap-3 rounded-xl border border-[var(--border-soft)]/70 bg-[var(--surface)] px-4 py-3 shadow-[var(--sh-1)] cursor-pointer"
          >
            <input
              type="checkbox"
              checked={Boolean(sim[key])}
              onChange={(e) => sim.setSim({ [key]: e.target.checked })}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            <span className="text-sm font-medium">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function OutboxPage() {
  const { messages, markRetried, clear } = useOutboxStore();
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <meta name="robots" content="noindex, nofollow" />
      <div className="flex justify-between items-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-[var(--accent)]">DEV OUTBOX</p>
          <h1 className="font-display text-3xl font-bold text-[var(--ink)]">Mock Email &amp; Alert Outbox ({messages.length})</h1>
        </div>
        <Button variant="secondary" size="sm" onClick={clear}>
          Clear outbox
        </Button>
      </div>
      {messages.length === 0 ? (
        <p className="rounded-xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 text-sm text-[var(--ink-muted)] shadow-[var(--sh-1)]">
          No simulated emails yet. Place an order or request OTP to inspect messages.
        </p>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <div key={m.id} className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-4 shadow-[var(--sh-1)] space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="font-bold">{m.subject}</span>
                <div className="flex items-center gap-2">
                  <StatusPill label={m.status} tone={m.status === 'sent' ? 'ok' : 'danger'} />
                  {m.status === 'failed' && (
                    <Button size="sm" variant="secondary" onClick={() => markRetried(m.id)}>
                      Retry
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs font-mono text-[var(--ink-muted)]">To: {m.to}</p>
              <p className="text-xs text-[var(--ink-muted)] whitespace-pre-wrap">{m.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SeoInspectorPage() {
  const { config, catalog } = useStore();
  const routes = useMemo(() => {
    const prods = catalog?.products || [];
    const cats = catalog?.categories || [];
    const list: Array<{ label: string; route: SeoRouteKey; path: string; extra?: Record<string, unknown> }> = [
      { label: 'Home', route: 'home', path: '/' },
      { label: 'Shop', route: 'shop', path: '/shop', extra: { products: prods } },
      { label: 'Wholesale', route: 'wholesale', path: '/wholesale' },
      { label: 'About', route: 'about', path: '/about' },
      { label: 'Contact', route: 'contact', path: '/contact' },
      { label: 'FAQ', route: 'faq', path: '/faq' },
      ...cats.map((c) => ({ label: `Category: ${c.name}`, route: 'category' as SeoRouteKey, path: `/c/${c.slug}`, extra: { category: c, products: prods } })),
      ...prods.map((p) => ({
        label: `Product: ${p.name}`,
        route: 'product' as SeoRouteKey,
        path: `/p/${p.slug}`,
        extra: { product: p, skus: catalog?.skus.filter((s) => s.productId === p.id) },
      })),
    ];

    return list.map((item) => {
      const out = renderSeo({ route: item.route, path: item.path, config, ...(item.extra || {}) });
      const rawJson = JSON.stringify(out.jsonLd);
      const wholesaleLeak = rawJson.includes('wholesalePricePaise') || rawJson.includes('6800');
      return {
        ...item,
        out,
        titleLen: out.head.title.length,
        descLen: out.head.description.length,
        wholesaleLeak,
      };
    });
  }, [config, catalog]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <meta name="robots" content="noindex, nofollow" />
      <h1 className="font-display text-3xl font-bold text-[var(--ink)]">SEO &amp; JSON-LD Inspector ({routes.length} routes)</h1>
      <div className="space-y-3">
        {routes.map((r) => (
          <div key={r.path} className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-4 shadow-[var(--sh-1)] space-y-1.5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold">{r.label} <code className="font-mono text-xs text-[var(--ink-muted)]">({r.path})</code></span>
              <div className="flex gap-2">
                <StatusPill label={`Title ${r.titleLen}ch`} tone={r.titleLen > 70 ? 'warn' : 'ok'} />
                <StatusPill label={`Desc ${r.descLen}ch`} tone={r.descLen > 165 ? 'warn' : 'ok'} />
                <StatusPill label={r.wholesaleLeak ? 'WHOLESALE LEAK' : 'No Wholesale Leak'} tone={r.wholesaleLeak ? 'danger' : 'ok'} />
              </div>
            </div>
            <p className="text-xs font-semibold text-[#1a0dab]">{r.out.head.title}</p>
            <p className="text-xs text-[var(--ink-muted)]">{r.out.head.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const { logs, piiDroppedCount, gtagLoaded, clearLogs } = useAnalyticsDebugStore();
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <meta name="robots" content="noindex, nofollow" />
      <div className="flex justify-between items-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-[var(--accent)]">DEV ANALYTICS</p>
          <h1 className="font-display text-3xl font-bold text-[var(--ink)]">Consent-Gated Event Log ({logs.length})</h1>
          <p className="text-xs text-[var(--ink-muted)]">gtag loaded: {String(gtagLoaded)} · PII fields stripped: {piiDroppedCount}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={clearLogs}>Clear logs</Button>
      </div>
      <div className="space-y-2">
        {logs.map((l) => (
          <div key={l.id} className="rounded-xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-3 text-xs shadow-[var(--sh-1)] space-y-1">
            <div className="flex justify-between font-mono">
              <strong>{l.name}</strong>
              <StatusPill label={l.status} tone={l.status === 'sent' ? 'ok' : l.status === 'queued' ? 'neutral' : 'warn'} />
            </div>
            <pre className="overflow-x-auto text-[11px] text-[var(--ink-muted)]">{JSON.stringify(l.params)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}

export function QuoteCasesPage() {
  const cases = useMemo(() => runAllQuoteCases(), []);
  const passed = cases.filter((c) => c.passed).length;
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <meta name="robots" content="noindex, nofollow" />
      <header className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-[var(--accent)]">IN-BROWSER QUOTE SUITE</p>
          <h1 className="font-display text-3xl font-bold text-[var(--ink)]">Quote &amp; GST Invariant Cases ({passed}/{cases.length})</h1>
        </div>
        <StatusPill label={passed === cases.length ? 'ALL PASS' : 'FAILURES'} tone={passed === cases.length ? 'ok' : 'danger'} />
      </header>
      <div className="space-y-2">
        {cases.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-soft)]/70 bg-[var(--surface)] px-4 py-3 text-sm shadow-[var(--sh-1)]">
            <div>
              <span className="font-mono font-bold mr-2">{c.id}</span>
              <span className="font-semibold">{c.name}</span>
              <p className="text-xs font-mono text-[var(--ink-muted)]">{c.detail}</p>
            </div>
            <StatusPill label={c.passed ? 'PASS' : 'FAIL'} tone={c.passed ? 'ok' : 'danger'} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExperienceInspectorPage() {
  const { config } = useStore();
  const { tier, fxEnabled, reducedMotion, prefetchAllowed, reasons, downgradedTier, downgrade, resetDowngrade, refreshTier } =
    useExperience();
  const [tick, setTick] = useState(0);
  const [vitals, setVitals] = useState<{ lcpMs: number | null; cls: number; longTasks: number }>({
    lcpMs: null,
    cls: 0,
    longTasks: 0,
  });

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 800);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof PerformanceObserver === 'undefined') return;
    let lcpObserver: PerformanceObserver | null = null;
    let clsObserver: PerformanceObserver | null = null;
    let ltObserver: PerformanceObserver | null = null;

    try {
      lcpObserver = new PerformanceObserver((list) => {
        const last = list.getEntries().at(-1);
        if (last) setVitals((v) => ({ ...v, lcpMs: Math.round(last.startTime) }));
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      // ignore unsupported
    }

    try {
      clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as Array<PerformanceEntry & { value?: number; hadRecentInput?: boolean }>) {
          if (!entry.hadRecentInput && typeof entry.value === 'number') {
            setVitals((v) => ({ ...v, cls: Number((v.cls + entry.value!).toFixed(4)) }));
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch {
      // ignore unsupported
    }

    try {
      ltObserver = new PerformanceObserver((list) => {
        setVitals((v) => ({ ...v, longTasks: v.longTasks + list.getEntries().length }));
      });
      ltObserver.observe({ type: 'longtask', buffered: true });
    } catch {
      // ignore unsupported
    }

    return () => {
      lcpObserver?.disconnect();
      clsObserver?.disconnect();
      ltObserver?.disconnect();
    };
  }, []);

  const decision = experienceTelemetry.decision;
  const metrics = experienceTelemetry.metrics;
  const prefetchLog = getPrefetchLog();
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const isFxOff = params.get('fx') === 'off';

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6" data-tick={tick}>
      <meta name="robots" content="noindex, nofollow" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-[var(--ink)]">Tier 0–2 Experience Inspector</h1>
        <div className="flex items-center gap-2">
          <StatusPill label={`TIER ${tier}`} tone={tier === 2 ? 'ok' : tier === 1 ? 'warn' : 'neutral'} />
          <StatusPill label={fxEnabled && !reducedMotion ? 'FX ON' : 'FX OFF'} tone={fxEnabled && !reducedMotion ? 'ok' : 'danger'} />
        </div>
      </div>

      {/* Tier & Gate Summary + ?fx=off A/B switch */}
      <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-3 text-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div><span className="text-[var(--ink-muted)] block">Config tier0</span><strong>{String(config.experience.tier0 ?? true)}</strong></div>
          <div><span className="text-[var(--ink-muted)] block">Config experience</span><strong>{String(config.features.experience)}</strong></div>
          <div><span className="text-[var(--ink-muted)] block">Prefetch allowed</span><strong>{String(prefetchAllowed)}</strong></div>
          <div><span className="text-[var(--ink-muted)] block">Session downgrade</span><strong>{downgradedTier === null ? 'none' : `Tier ${downgradedTier}`}</strong></div>
        </div>

        <p><strong>Active Reasons:</strong> {reasons.length ? reasons.join(' · ') : 'None (all Tier 0–2 checks passed)'}</p>
        <p className="text-xs text-[var(--ink-muted)]"><strong>Tier 2 3D Hero Gate loaded:</strong> {String(decision?.load ?? false)}</p>

        <div className="flex flex-wrap gap-2 pt-2">
          <a
            href={isFxOff ? '/dev/experience' : '/dev/experience?fx=off'}
            className="pressable inline-flex min-h-[36px] items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--surface-high)] transition-colors"
          >
            {isFxOff ? 'Switch A/B -> FX ON' : 'Switch A/B -> ?fx=off'}
          </a>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              experienceTelemetry.controller?.dispose();
              downgrade('simulated_slow_frames_gt24ms');
            }}
          >
            Simulate slow frames (&gt; 24 ms)
          </Button>
          {downgradedTier !== null && (
            <Button size="sm" variant="secondary" onClick={resetDowngrade}>
              Reset session downgrade
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              localStorage.setItem('experience_opt_out', '1');
              refreshTier();
            }}
          >
            Set experience_opt_out=1
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              localStorage.removeItem('experience_opt_out');
              refreshTier();
            }}
          >
            Clear opt-out
          </Button>
        </div>
      </div>

      {/* Tier 0 Interactive Test Panel */}
      <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-4 text-sm">
        <h2 className="font-display text-lg font-bold text-[var(--ink)]">Tier 0 Effects Test Panel (CSS &amp; WAAPI)</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={(e) => {
              flyToCart({ sourceEl: e.currentTarget, imageUrl: null, fxEnabled, reducedMotion });
              triggerHaptic('add', { fxEnabled, reducedMotion });
            }}
          >
            Trigger Fly-to-Cart + Haptic
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigateWithTransition(() => setTick((n) => n + 1), { enabled: fxEnabled })}
          >
            Test View Transition pulse
          </Button>
          <PrefetchLink
            to="/p/aloo-bhujia"
            className="pressable inline-flex min-h-[36px] items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--surface-high)] transition-colors"
          >
            PrefetchLink -&gt; Aloo Bhujia
          </PrefetchLink>
          <Button size="sm" variant="ghost" onClick={() => { clearPrefetchLog(); setTick((n) => n + 1); }}>
            Clear prefetch log
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3 tabular-nums">
          <div className="rounded-xl bg-[var(--surface-2)] p-3">
            <span className="text-xs text-[var(--ink-muted)] block">Observed LCP</span>
            <strong className="text-base">{vitals.lcpMs !== null ? `${vitals.lcpMs} ms` : '—'}</strong>
          </div>
          <div className="rounded-xl bg-[var(--surface-2)] p-3">
            <span className="text-xs text-[var(--ink-muted)] block">Observed CLS</span>
            <strong className="text-base">{vitals.cls}</strong>
          </div>
          <div className="rounded-xl bg-[var(--surface-2)] p-3">
            <span className="text-xs text-[var(--ink-muted)] block">Long tasks (&gt;50 ms)</span>
            <strong className="text-base">{vitals.longTasks}</strong>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold text-[var(--ink-muted)]">Prefetch Log ({prefetchLog.length} recent)</p>
          {prefetchLog.length === 0 ? (
            <p className="text-xs text-[var(--ink-muted)]">Hover/pointerdown or scroll PrefetchLink elements to record prefetches.</p>
          ) : (
            <ul className="space-y-1 font-mono text-xs">
              {prefetchLog.map((entry, idx) => (
                <li key={`${entry.url}-${idx}`} className="flex justify-between rounded bg-[var(--surface-2)] px-2.5 py-1">
                  <span>{entry.url}</span>
                  <span className="text-[var(--ink-muted)]">{entry.source}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="reveal rounded-xl border border-[var(--border-soft)] bg-[var(--bg)] p-3 text-xs">
          Scroll-driven <code className="font-mono">.reveal</code> preview block (compositor transform + opacity under <code className="font-mono">prefers-reduced-motion: no-preference</code>).
        </div>
      </div>

      {/* Tier 2 WebGL Metrics */}
      <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-3 text-sm">
        <h2 className="font-display text-lg font-bold text-[var(--ink)]">Tier 2 WebGL &amp; Disposal Telemetry</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 tabular-nums">
          <div className="rounded-xl bg-[var(--surface-2)] p-3">
            <span className="text-xs text-[var(--ink-muted)] block">FPS</span>
            <strong className="text-lg">{metrics?.fps ?? '—'}</strong>
          </div>
          <div className="rounded-xl bg-[var(--surface-2)] p-3">
            <span className="text-xs text-[var(--ink-muted)] block">Frame Time</span>
            <strong className="text-lg">{metrics ? `${metrics.lastFrameMs} ms` : '—'}</strong>
          </div>
          <div className="rounded-xl bg-[var(--surface-2)] p-3">
            <span className="text-xs text-[var(--ink-muted)] block">Geometries</span>
            <strong className="text-lg">{metrics?.geometries ?? 0}</strong>
          </div>
          <div className="rounded-xl bg-[var(--surface-2)] p-3">
            <span className="text-xs text-[var(--ink-muted)] block">Triangles</span>
            <strong className="text-lg">{metrics?.triangles ?? 0}</strong>
          </div>
        </div>
        {experienceTelemetry.controller?.triggerLostContextSim && (
          <Button size="sm" variant="danger" onClick={() => experienceTelemetry.controller?.triggerLostContextSim?.()}>
            Simulate WebGL Context Lost
          </Button>
        )}
      </div>

      <p className="text-xs text-[var(--ink-muted)]">
        Inspect <code className="font-mono">/?fx=off</code> vs <code className="font-mono">/</code> or <code className="font-mono">/?experience=off</code>. Format sample: {formatINR(9500)}.
      </p>
    </div>
  );
}
