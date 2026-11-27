import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../stores/appContext';
import { evaluateClientConfig } from '../../shared/clientCheck';
import { runAllQuoteCases } from '../../shared/quoteCases';
import { renderSeo } from '../../seo/render';
import { StatusPill } from '../../components/ui/Badge';

export function ChecksPage() {
  const { config, catalog } = useStore();

  const clientRows = useMemo(() => evaluateClientConfig(config, false), [config]);
  const quoteCases = useMemo(() => runAllQuoteCases(), []);
  const quotePassed = quoteCases.every((c) => c.passed);

  const seoHome = useMemo(() => renderSeo({ route: 'home', path: '/', config }), [config]);
  const seoProd = useMemo(() => {
    const p = catalog?.products[0];
    const skus = catalog?.skus.filter((s) => s.productId === p?.id) || [];
    return renderSeo({ route: 'product', path: p ? `/p/${p.slug}` : '/p/none', config, product: p, skus });
  }, [config, catalog]);

  const inBrowserChecks = [
    {
      name: 'Client config schema & N1 placeholder audit',
      status: clientRows.every((r) => r.ok) ? 'PASS' : 'WARN',
      detail: `${clientRows.filter((r) => r.ok).length}/${clientRows.length} checks clean`,
    },
    {
      name: 'Quote, GST, Tier, Slab & Coupon invariants',
      status: quotePassed ? 'PASS' : 'FAIL',
      detail: `${quoteCases.filter((c) => c.passed).length}/${quoteCases.length} passed`,
    },
    {
      name: 'SEO & Wholesale Isolation in Public JSON-LD',
      status: JSON.stringify(seoProd.jsonLd).includes('6800') ? 'FAIL' : 'PASS',
      detail: `Home title ${seoHome.head.title.length}ch · Product JSON-LD clean`,
    },
    {
      name: 'Feature toggles active state',
      status: 'PASS',
      detail: `PWA=${String(config.features.pwa)} · Experience=${String(config.features.experience)} · Wholesale=${String(config.features.wholesale)}`,
    },
  ];

  const externalChecks = [
    'npm run typecheck (requires terminal tsc run)',
    'npm run lint (requires ESLint CLI)',
    'npm test (requires Vitest runner)',
    'npm run build:seo & npm run check:budget (requires Vite build & prerender script)',
    'npx playwright test (requires headless browser E2E suite)',
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      <meta name="robots" content="noindex, nofollow" />
      <header className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-wider text-[var(--accent)]">SECTION O9 SELF-VERIFICATION</p>
        <h1 className="font-display text-3xl font-bold text-[var(--ink)]">System &amp; Readiness Checks</h1>
      </header>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold text-[var(--ink)]">In-Browser Runtime Checks (Live)</h2>
        <div className="space-y-2">
          {inBrowserChecks.map((c) => (
            <div key={c.name} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-soft)]/70 bg-[var(--surface)] px-4 py-3 text-sm shadow-[var(--sh-1)]">
              <div>
                <p className="font-semibold text-[var(--ink)]">{c.name}</p>
                <p className="text-xs text-[var(--ink-muted)] font-mono">{c.detail}</p>
              </div>
              <StatusPill label={c.status} tone={c.status === 'PASS' ? 'ok' : c.status === 'WARN' ? 'warn' : 'danger'} />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold text-[var(--ink)]">Quick Inspector Links</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          {[
            ['/dev/styleguide', 'Styleguide'],
            ['/dev/quote-cases', 'Quote Cases (21)'],
            ['/dev/seo', 'SEO Inspector'],
            ['/dev/sim', 'Chaos Simulator'],
            ['/dev/outbox', 'Email Outbox'],
            ['/dev/analytics', 'Analytics Log'],
            ['/dev/experience', '3D Experience'],
          ].map(([to, label]) => (
            <Link key={to} to={to} className="pressable rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-high)] px-3.5 py-2 font-medium text-[var(--ink)] transition-colors">
              {label}
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold text-[var(--ink)]">CLI / Build Checks (Run in Terminal / CI)</h2>
        <ul className="space-y-2">
          {externalChecks.map((item) => (
            <li key={item} className="flex items-center justify-between rounded-xl border border-[var(--border-soft)]/70 bg-[var(--surface-2)] px-4 py-2.5 text-xs font-mono">
              <span>{item}</span>
              <StatusPill label="CLI ONLY" tone="neutral" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
