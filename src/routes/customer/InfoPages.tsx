import { Link, useParams } from 'react-router-dom';
import { WifiOff, Wrench, Clock } from 'lucide-react';
import { useStore } from '../../stores/appContext';
import { Seo } from '../../seo/Seo';
import { formatAddress } from '../../shared/address';
import { getShopStatus } from '../../shared/calendar';
import { ContactActions } from '../../components/ui/ContactActions';

export function AboutPage() {
  const { config, catalog } = useStore();
  const activeProducts = catalog?.products.filter((p) => p.status === 'active').length ?? 0;
  return (
    <>
      <Seo route="about" path="/about" config={config} />
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[var(--ink)]">
          About {config.brand.name}
        </h1>
        <p className="text-base text-[var(--ink-muted)] leading-relaxed">
          {config.brand.tagline}. Every batch of Bikaneri bhujia, Ratlami laung sev, spiced boondi, and hand-pressed butter murukku is prepared in small daily runs using cold-pressed groundnut oil and sealed within hours into multi-layer nitrogen-flushed pouches.
        </p>

        <div className="grid grid-cols-3 gap-3 rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-4 sm:p-5 shadow-[var(--sh-1)] tabular-nums">
          <div>
            <p className="font-display text-2xl font-bold text-[var(--primary)]">{activeProducts}</p>
            <p className="text-xs text-[var(--ink-muted)]">Active recipes</p>
          </div>
          <div>
            <p className="font-display text-2xl font-bold text-[var(--primary)]">
              {config.dispatchDays} {config.dispatchDays === 1 ? 'day' : 'days'}
            </p>
            <p className="text-xs text-[var(--ink-muted)]">Dispatch turnaround</p>
          </div>
          <div>
            <p className="font-display text-2xl font-bold text-[var(--primary)]">100%</p>
            <p className="text-xs text-[var(--ink-muted)]">Groundnut oil</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Quality &amp; Legal</p>
            <p className="text-sm font-semibold text-[var(--ink)]">{config.legal.legalName}</p>
            <p className="text-xs text-[var(--ink-muted)] font-mono">FSSAI: {config.legal.fssai}</p>
            <p className="text-xs text-[var(--ink-muted)] font-mono">GSTIN: {config.legal.gstin}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Kitchen Address</p>
            <p className="text-sm text-[var(--ink)]">{formatAddress(config)}</p>
          </div>
        </div>
      </div>
    </>
  );
}

export function ContactPage() {
  const { config } = useStore();
  const shop = getShopStatus(config);
  return (
    <>
      <Seo route="contact" path="/contact" config={config} />
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
        <div className="space-y-2">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[var(--ink)]">Contact &amp; Flagship Store</h1>
          <p className="text-sm text-[var(--ink-muted)]">
            {shop.nextOpenText} · {formatAddress(config)}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-6 shadow-[var(--sh-1)] space-y-4">
          <ContactActions config={config} context="contact_page" />
        </div>
      </div>
    </>
  );
}

export function FaqPage() {
  const { config } = useStore();
  const items = [
    ['Which oil do you fry in?', 'We fry all sev, bhujia, mixtures, and boondi in pure cold-pressed groundnut oil with zero palm oil.'],
    ['How fast do you dispatch all-India courier orders?', `Confirmed orders dispatch within ${config.dispatchDays} working day in IST, packed in cushioned corrugated cartons.`],
    ['Can I get a GST input credit invoice for wholesale orders?', 'Yes. Verified wholesale buyers and anyone supplying a valid 15-character GSTIN at checkout receive a downloadable CGST+SGST or IGST tax invoice.'],
    ['What is your refund or damaged parcel policy?', 'Packaged food cannot be returned once opened, but damaged or wrong packs are replaced or refunded in full upon photo verification within 48 hours of delivery.'],
  ];

  return (
    <>
      <Seo route="faq" path="/faq" config={config} />
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
        <h1 className="font-display text-3xl font-bold text-[var(--ink)]">Frequently asked questions</h1>
        <div className="space-y-3">
          {items.map(([q, a]) => (
            <details key={q} className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] px-5 py-4 text-sm shadow-[var(--sh-1)]">
              <summary className="cursor-pointer font-bold text-[var(--ink)]">{q}</summary>
              <p className="mt-2 text-[var(--ink-muted)] leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </>
  );
}

export function PolicyPage() {
  const { type = 'privacy' } = useParams<{ type: string }>();
  const { config } = useStore();

  const titles: Record<string, string> = {
    privacy: 'Privacy Policy',
    terms: 'Terms & Conditions',
    refund: 'Refund & Replacement Policy',
    refunds: 'Refund & Replacement Policy',
    shipping: 'Shipping & Delivery Policy',
  };

  const seoRoute =
    type === 'terms' ? 'terms' : type === 'refund' || type === 'refunds' ? 'refund' : type === 'shipping' ? 'shipping' : 'privacy';

  return (
    <>
      <Seo route={seoRoute} path={`/policies/${type}`} config={config} />
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-4">
        <h1 className="font-display text-3xl font-bold text-[var(--ink)]">{titles[type] || 'Store Policy'}</h1>
        <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-6 shadow-[var(--sh-1)] space-y-4">
          <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
            {config.legal.legalName} (FSSAI {config.legal.fssai}, GSTIN {config.legal.gstin}) operates this storefront. We store only essential cart and order details required to fulfil your order and generate valid GST tax invoices. Analytics cookies remain disabled unless explicitly accepted.
          </p>
          <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
            All food items are packed fresh in sealed moisture-barrier pouches. Opened food packs cannot be returned; transit damage or weight discrepancies reported within 48 hours on {config.contact.email} are replaced or refunded in full within 5 working days.
          </p>
        </div>
      </div>
    </>
  );
}

export function BusyPage() {
  const { config } = useStore();
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
      <Clock className="h-10 w-10 text-[var(--primary)] mx-auto" aria-hidden="true" />
      <h1 className="font-display text-2xl font-bold text-[var(--ink)]">Kitchen temporarily busy</h1>
      <p className="text-sm text-[var(--ink-muted)]">{config.manualStatusNote || 'High festive order volume right now. Browsing remains available.'}</p>
      <Link to="/shop" className="pressable inline-flex min-h-[44px] items-center rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] px-5 text-sm font-semibold text-white transition-colors">
        Browse snacks
      </Link>
    </div>
  );
}

export function MaintenancePage() {
  const { config } = useStore();
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
      <Wrench className="h-10 w-10 text-[var(--primary)] mx-auto" aria-hidden="true" />
      <h1 className="font-display text-2xl font-bold text-[var(--ink)]">Scheduled maintenance</h1>
      <p className="text-sm text-[var(--ink-muted)]">
        {config.brand.name} is updating stock &amp; pricing. Check back in a few minutes or call {config.contact.phone}.
      </p>
    </div>
  );
}

export function OfflinePage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
      <WifiOff className="h-10 w-10 text-[var(--primary)] mx-auto" aria-hidden="true" />
      <h1 className="font-display text-2xl font-bold text-[var(--ink)]">You&apos;re offline</h1>
      <p className="text-sm text-[var(--ink-muted)]">Reconnect to place an order or verify pincode delivery.</p>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4" data-status="404">
      <p className="font-mono text-sm font-bold text-[var(--accent)]">404</p>
      <h1 className="font-display text-3xl font-bold text-[var(--ink)]">Page not found</h1>
      <p className="text-sm text-[var(--ink-muted)]">The page or product slug you looked for isn&apos;t here.</p>
      <Link to="/shop" className="pressable inline-flex min-h-[44px] items-center rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] px-5 text-sm font-semibold text-white transition-colors">
        Back to Shop
      </Link>
    </div>
  );
}
