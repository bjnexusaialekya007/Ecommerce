import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Award, Briefcase, CheckCircle2, FileText, Lock, LogOut, RefreshCw, Scale, ShieldCheck, Store } from 'lucide-react';
import { api } from '../../api';
import type { OrderRecord, WholesaleQuoteRequest } from '../../api/client';
import { INDIAN_STATES } from '../../shared/constants';
import { formatINR, validateGSTIN, validateIndianPhone } from '../../shared/money';
import { formatIstDateTimeDisplay } from '../../shared/calendar';
import { WholesaleRegisterSchema } from '../../shared/schemas';
import { useStore } from '../../stores/appContext';
import { useAuthStore } from '../../stores/auth';
import { useCartStore } from '../../stores/cart';
import { useUiStore } from '../../stores/ui';
import { Seo } from '../../seo/Seo';
import { Button } from '../../components/ui/Button';
import { Input, PhoneInput, Select, Textarea } from '../../components/ui/Input';
import { OtpLoginForm } from '../../components/shop/OtpLoginForm';
import { StatusPill } from '../../components/ui/Badge';
import { TurnstileWidget } from '../../components/shop/TurnstileWidget';

export function WholesaleOverviewPage() {
  const { config } = useStore();
  const buyer = useAuthStore((s) => s.buyer);

  return (
    <>
      <Seo route="wholesale" path="/wholesale" config={config} />
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        <header className="rounded-2xl bg-[var(--ink)] text-white p-6 sm:p-10 space-y-4 shadow-[var(--sh-2)]">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent-soft)]">B2B Wholesale Partner Program</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold">
            Factory-direct namkeen pricing for kiranas, caterers &amp; corporate gifting
          </h1>
          <p className="text-sm sm:text-base text-white/80 max-w-2xl">
            Approved partners unlock wholesale base rates (excl. GST), tiered volume slabs starting at 20 packs, and automatic B2B GST input credit invoices.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {buyer ? (
              <Link
                to="/account"
                className="pressable inline-flex min-h-[48px] items-center rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] px-6 text-sm font-bold text-white transition-colors whitespace-nowrap shrink-0"
              >
                Open Buyer Portal
              </Link>
            ) : (
              <>
                <Link
                  to="/wholesale/register"
                  className="pressable inline-flex min-h-[48px] items-center rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] px-6 text-sm font-bold text-white transition-colors whitespace-nowrap shrink-0"
                >
                  Apply with GSTIN
                </Link>
                <Link
                  to="/wholesale/login"
                  className="pressable inline-flex min-h-[48px] items-center rounded-xl border border-white/25 px-6 text-sm font-semibold text-white hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
                >
                  Existing Buyer Login
                </Link>
              </>
            )}
            <Link
              to="/wholesale/quote"
              className="pressable inline-flex min-h-[48px] items-center rounded-xl border border-white/25 px-6 text-sm font-semibold text-white hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
            >
              Request Custom Bulk Quote
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            ['1. Verify GSTIN once', 'Submit your 15-digit GSTIN, business name, and trade phone. Our desk approves verified trade accounts within 24 hours.'],
            ['2. Sign in via email OTP', 'Passwordless 6-digit OTP unlocks wholesale rate slabs across all active SKUs automatically in the storefront & cart.'],
            ['3. Automated B2B invoicing', 'GST is billed exclusive of unit prices as CGST+SGST (intra-state) or IGST (inter-state) for seamless input tax credit.'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-2">
              <h2 className="font-display text-lg font-bold text-[var(--ink)]">{title}</h2>
              <p className="text-sm text-[var(--ink-muted)] leading-relaxed">{body}</p>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

const VOLUME_TIERS = [
  { id: 'lt50', label: '< 50 kg', sub: 'Trial / Boutique Cafe' },
  { id: '50-200', label: '50 – 200 kg', sub: 'Single Retail Store' },
  { id: '200-500', label: '200 – 500 kg', sub: 'Multi-Outlet Sweet Mart' },
  { id: 'gt500', label: '500 kg +', sub: 'Institutional / Supermarket' },
] as const;

export function WholesaleRegisterPage() {
  const { config } = useStore();
  const pushToast = useUiStore((s) => s.pushToast);

  const [form, setForm] = useState({
    businessName: '',
    ownerName: '',
    gstin: '',
    phone: '',
    email: '',
    stateCode: config.legal.stateCode,
    address: '',
  });
  const [establishmentCategory, setEstablishmentCategory] = useState('sweet-mart');
  const [monthlyVolume, setMonthlyVolume] = useState<string>('50-200');
  const [confirmResale, setConfirmResale] = useState(true);
  const [confirmTerms, setConfirmTerms] = useState(true);
  const [turnstile, setTurnstile] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const gstStateCode = form.gstin.length >= 2 ? form.gstin.slice(0, 2) : '';
  const gstStateName = INDIAN_STATES[gstStateCode] || '';
  const gstValid = form.gstin.length === 15 && validateGSTIN(form.gstin);

  const handleGstinChange = (val: string) => {
    const clean = val.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15);
    const code = clean.slice(0, 2);
    setForm((prev) => ({
      ...prev,
      gstin: clean,
      stateCode: INDIAN_STATES[code] ? code : prev.stateCode,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const errs: Record<string, string> = {};
    if (!validateGSTIN(form.gstin)) errs.gstin = 'Enter a valid 15-character GSTIN checksum.';
    if (!validateIndianPhone(form.phone)) errs.phone = 'Enter a 10-digit Indian mobile number.';
    if (!confirmResale || !confirmTerms) errs.declarations = 'Please confirm both statutory declarations.';
    if (!turnstile) errs.turnstile = 'Verify you are human.';

    const parsed = WholesaleRegisterSchema.safeParse(form);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errs[String(issue.path[0])] = issue.message;
      }
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      await api.registerWholesale(parsed.data!);
      setSubmitted(true);
      pushToast({ message: 'Wholesale application submitted for review.', tone: 'success' });
    } catch (err) {
      pushToast({ message: err instanceof Error ? err.message : 'Unable to submit application.', tone: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center space-y-4">
        <div className="mx-auto h-16 w-16 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-[var(--accent)]" aria-hidden="true" />
        </div>
        <h1 className="font-display text-2xl font-bold text-[var(--ink)]">Application received</h1>
        <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
          Your GSTIN <strong className="font-mono text-[var(--ink)]">{form.gstin}</strong> is queued with our trade desk. Check approval status anytime on the Wholesale Login page.
        </p>
        <Link
          to="/wholesale/login"
          className="pressable inline-flex min-h-[44px] items-center rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] px-6 text-sm font-semibold text-white transition-colors"
        >
          Go to Wholesale Login
        </Link>
      </div>
    );
  }

  return (
    <>
      <Seo route="wholesale" path="/wholesale/register" config={config} />
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8 space-y-5">
        {/* Top Stepper Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="uppercase tracking-wider text-[var(--accent)]">Step 1 of 2</span>
            <span className="text-[var(--ink-muted)]">Next: Desk Review &amp; Portal Unlock</span>
          </div>
          <div className="grid grid-cols-2 gap-2 h-1.5 rounded-full overflow-hidden">
            <div className="bg-[var(--primary)] h-full rounded-full" />
            <div className="bg-[var(--surface-2)] h-full rounded-full" />
          </div>
        </div>

        {/* Editorial Headline */}
        <header className="space-y-2">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)]">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>Direct Artisan Mill Sourcing</span>
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[var(--ink)] tracking-tight leading-tight">
            Merchant Account Registration
          </h1>
          <p className="text-sm sm:text-base text-[var(--ink-muted)] leading-relaxed">
            Enter your verified business credentials to unlock tier-1 wholesale pricing, bulk batches, and GST B2B dispatches.
          </p>
        </header>

        {/* Pistachio Strict Price Protection Notice */}
        <div className="rounded-xl bg-[var(--accent-soft)] p-4 flex items-start gap-3 text-[var(--on-secondary-container)] shadow-[var(--sh-1)]">
          <div className="p-2 rounded-lg bg-[var(--surface)]/80 text-[var(--accent)] shrink-0">
            <Lock className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--on-secondary-fixed)]">Strict Price Protection</p>
            <p className="text-xs leading-snug mt-0.5 text-[var(--on-secondary-container)]">
              Wholesale price tiers, trade slabs, and dispatch manifests are exclusively accessible to GST-verified commercial accounts.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Card 1: Entity Particulars & GSTIN */}
          <section className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-4">
            <div className="flex items-center justify-between gap-2 pb-1">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-[var(--primary)]" aria-hidden="true" />
                <h2 className="font-display text-lg font-bold text-[var(--ink)]">Entity Particulars</h2>
              </div>
              <span className="text-xs font-semibold text-[var(--ink-muted)]">B2B Trade</span>
            </div>

            <Input
              label="Business / Legal Entity Name"
              placeholder="e.g. Shree Ganesh Sweets & Snacks Pvt Ltd"
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              error={errors.businessName}
              required
            />

            <Select
              label="Establishment Category"
              value={establishmentCategory}
              onChange={(e) => setEstablishmentCategory(e.target.value)}
              options={[
                { value: 'sweet-mart', label: 'Sweet Mart / Namkeen Speciality Store' },
                { value: 'retail-gourmet', label: 'Retail Gourmet & Pantry Store' },
                { value: 'supermarket', label: 'Supermarket / Hypermarket Chain' },
                { value: 'horeca', label: 'Cloud Kitchen / Catering & HORECA' },
                { value: 'corporate-gifting', label: 'Institutional / Corporate Festive Gifting' },
              ]}
            />

            <div className="space-y-2">
              <Input
                label="GSTIN (15 Digits)"
                maxLength={15}
                value={form.gstin}
                onChange={(e) => handleGstinChange(e.target.value)}
                error={errors.gstin}
                className="font-mono uppercase tracking-wider"
                placeholder="36AABCU9603R1ZO"
                helper="Validated against official GSTIN checksum rules for B2B input tax credit."
                required
              />

              {gstValid && gstStateName && (
                <div className="rounded-xl bg-[var(--accent-soft)] px-3.5 py-2.5 flex items-center justify-between gap-2 text-[var(--on-secondary-fixed)]">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">
                      State: {gstStateName} (Code {gstStateCode})
                    </p>
                    <p className="text-[11px] text-[var(--on-secondary-container)] truncate">
                      Checksum verified · Eligible for ITC tax invoice
                    </p>
                  </div>
                  <span className="text-[11px] font-bold uppercase text-[var(--accent)] shrink-0">Valid</span>
                </div>
              )}
            </div>
          </section>

          {/* Card 2: Authorized Signatory */}
          <section className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-4">
            <h2 className="font-display text-lg font-bold text-[var(--ink)]">Authorized Signatory</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Owner / Buyer Name"
                placeholder="e.g. Rameshwar Sharma"
                value={form.ownerName}
                onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                error={errors.ownerName}
                required
              />
              <PhoneInput
                label="WhatsApp Business Mobile"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                error={errors.phone}
                required
              />
            </div>
            <Input
              label="Official Accounts & OTP Email"
              type="email"
              placeholder="procurement@ganeshsweets.in"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={errors.email}
              helper="Tax invoices and passwordless OTP sign-in links are sent here."
              required
            />
          </section>

          {/* Card 3: Registered Billing / Warehouse */}
          <section className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-4">
            <h2 className="font-display text-lg font-bold text-[var(--ink)]">Registered Billing / Warehouse</h2>
            <Select
              label="Business State"
              value={form.stateCode}
              onChange={(e) => setForm({ ...form, stateCode: e.target.value })}
              options={Object.entries(INDIAN_STATES).map(([k, v]) => ({ value: k, label: `${k} · ${v}` }))}
            />
            <Textarea
              label="Full Shop / Warehouse Address"
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              error={errors.address}
              placeholder="Unit 14-B, Market Yard, Pincode"
              required
            />
          </section>

          {/* Card 4: Monthly Procurement Run-Rate */}
          <section className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-[var(--primary)]" aria-hidden="true" />
                <h2 className="font-display text-lg font-bold text-[var(--ink)]">Monthly Procurement Run-Rate</h2>
              </div>
              <span className="text-xs font-medium text-[var(--ink-muted)]">Guides tier desk</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {VOLUME_TIERS.map((tier) => {
                const active = monthlyVolume === tier.id;
                return (
                  <label
                    key={tier.id}
                    className={`cursor-pointer rounded-xl p-3 transition-colors border ${
                      active
                        ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-[var(--sh-1)]'
                        : 'bg-[var(--surface-2)] text-[var(--ink)] border-[var(--border)] hover:bg-[var(--surface-high)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="monthlyVolume"
                      value={tier.id}
                      checked={active}
                      onChange={() => setMonthlyVolume(tier.id)}
                      className="sr-only"
                    />
                    <span className="block text-sm font-bold">{tier.label}</span>
                    <span className={`block text-xs mt-0.5 ${active ? 'text-[var(--on-primary-container)]' : 'text-[var(--ink-muted)]'}`}>
                      {tier.sub}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Card 5: Statutory Declaration & Verification */}
          <section className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-3.5">
            <h2 className="font-display text-lg font-bold text-[var(--ink)]">Statutory Declaration</h2>
            <label className="flex items-start gap-2.5 text-xs text-[var(--ink-muted)] cursor-pointer min-h-[36px]">
              <input
                type="checkbox"
                checked={confirmResale}
                onChange={(e) => setConfirmResale(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
              />
              <span>
                Goods procured under this trade account are intended for <strong className="text-[var(--ink)]">commercial resale or catering</strong>.
              </span>
            </label>
            <label className="flex items-start gap-2.5 text-xs text-[var(--ink-muted)] cursor-pointer min-h-[36px]">
              <input
                type="checkbox"
                checked={confirmTerms}
                onChange={(e) => setConfirmTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
              />
              <span>
                I accept the <Link to="/policies/terms" className="font-semibold text-[var(--primary)] underline">B2B Terms of Supply</Link> and transit claim schedule.
              </span>
            </label>
            {errors.declarations && <p className="text-xs font-medium text-[var(--danger)]">{errors.declarations}</p>}

            <TurnstileWidget siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || ''} onVerify={setTurnstile} />
            {errors.turnstile && <p className="text-xs font-medium text-[var(--danger)]">{errors.turnstile}</p>}
          </section>

          {/* Mill Assurance Callout */}
          <div className="rounded-xl bg-[var(--surface-2)] p-3.5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0">
              <Award className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                {config.brand.name} · Kitchen Assurance
              </p>
              <p className="text-xs text-[var(--ink-muted)] leading-snug mt-0.5">
                Cold-pressed groundnut oil batches roasted upon confirmation under FSSAI {config.legal.fssai}.
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
              <span>Submit GST Application</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-[var(--accent)]">Approval review: Under 4 working hours</span>
              <Link to="/wholesale/login" className="font-semibold text-[var(--primary)] hover:underline whitespace-nowrap">
                Already registered? Login via OTP
              </Link>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

export function WholesaleLoginPage() {
  const { config } = useStore();
  const setBuyer = useAuthStore((s) => s.setBuyer);
  const navigate = useNavigate();

  return (
    <>
      <Seo route="wholesale" path="/wholesale/login" config={config} />
      <div className="mx-auto max-w-4xl px-4 py-12 space-y-6">
        <OtpLoginForm
          role="wholesale"
          title="Wholesale Buyer Sign In"
          subtitle="Use the trade email registered with your wholesale application. Demo approved account: wholesale@annapurnastores.in"
          defaultEmail="wholesale@annapurnastores.in"
          onVerified={async () => {
            const me = await api.getWholesaleMe();
            setBuyer(me.buyer);
            navigate('/account');
          }}
        />
      </div>
    </>
  );
}

export function WholesaleAccountPage() {
  const { config } = useStore();
  const buyer = useAuthStore((s) => s.buyer);
  const setBuyer = useAuthStore((s) => s.setBuyer);
  const rememberOrderAccess = useAuthStore((s) => s.rememberOrderAccess);
  const replaceLines = useCartStore((s) => s.replaceLines);
  const pushToast = useUiStore((s) => s.pushToast);
  const navigate = useNavigate();

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [quotes, setQuotes] = useState<WholesaleQuoteRequest[]>([]);

  useEffect(() => {
    api
      .getWholesaleMe()
      .then((res) => {
        if (res.buyer) setBuyer(res.buyer);
        setOrders(res.orders);
        setQuotes(res.quotes);
      })
      .catch(() => {});
  }, []);

  if (!buyer) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center space-y-4">
        <p className="text-sm text-[var(--ink-muted)]">Sign in to access your wholesale buyer portal.</p>
        <Link to="/wholesale/login" className="pressable inline-flex min-h-[44px] items-center rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] px-5 text-sm font-semibold text-white transition-colors">
          Sign in with Email OTP
        </Link>
      </div>
    );
  }

  return (
    <>
      <Seo route="wholesale" path="/account" config={config} />
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-[var(--primary)]" aria-hidden="true" />
              <h1 className="font-display text-2xl font-bold text-[var(--ink)]">{buyer.businessName || buyer.name}</h1>
              <StatusPill
                label={buyer.wholesaleStatus || 'pending'}
                tone={buyer.wholesaleStatus === 'approved' ? 'ok' : buyer.wholesaleStatus === 'rejected' ? 'danger' : 'warn'}
              />
            </div>
            <p className="text-xs text-[var(--ink-muted)] font-mono">
              GSTIN: {buyer.gstin || '—'} · {buyer.email}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/shop" className="pressable inline-flex min-h-[44px] items-center rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] px-4 text-sm font-semibold text-white transition-colors">
              Order at wholesale rates
            </Link>
            <Button
              variant="secondary"
              onClick={async () => {
                await api.logout('wholesale');
                setBuyer(null);
                navigate('/wholesale');
              }}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Sign out</span>
            </Button>
          </div>
        </header>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-[var(--ink)]">Recent wholesale orders</h2>
          {orders.length === 0 ? (
            <p className="rounded-xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 text-sm text-[var(--ink-muted)] shadow-[var(--sh-1)]">
              No wholesale orders placed yet.
            </p>
          ) : (
            <div className="space-y-3">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-4 shadow-[var(--sh-1)]"
                >
                  <div>
                    <p className="font-bold text-[var(--ink)]">{ord.publicCode}</p>
                    <p className="text-xs text-[var(--ink-muted)]">
                      {formatIstDateTimeDisplay(ord.createdAt)} · {ord.items.length} SKUs · {formatINR(ord.total)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        replaceLines(ord.items.map((i) => ({ skuId: i.skuId, qty: i.qty })));
                        pushToast({ message: `Loaded items from ${ord.publicCode} into cart`, tone: 'success' });
                        navigate('/cart');
                      }}
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      Reorder
                    </Button>
                    <Link
                      to={`/invoice/${ord.publicCode}?t=${encodeURIComponent(ord.invoiceToken)}`}
                      onClick={() => rememberOrderAccess(ord.publicCode, ord.phone.slice(-4))}
                      className="pressable inline-flex min-h-[36px] items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-high)] px-3 text-xs font-semibold text-[var(--ink)] transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5 text-[var(--primary)]" aria-hidden="true" />
                      Invoice
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {quotes.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-[var(--ink)]">Custom quote requests</h2>
            <div className="space-y-2">
              {quotes.map((q) => (
                <div key={q.id} className="rounded-xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-4 shadow-[var(--sh-1)] text-sm">
                  <div className="flex justify-between">
                    <span className="font-semibold">{q.items.length} SKUs requested</span>
                    <StatusPill label={q.status} tone={q.status === 'replied' ? 'ok' : 'neutral'} />
                  </div>
                  {q.replyNote && <p className="mt-1 text-xs text-[var(--ink-muted)]">Desk reply: {q.replyNote}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

export function WholesaleQuotePage() {
  const { config, catalog } = useStore();
  const pushToast = useUiStore((s) => s.pushToast);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [skuId, setSkuId] = useState('');
  const [qty, setQty] = useState(50);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const skus = catalog?.skus.filter((s) => s.status === 'active') || [];
  const effectiveSkuId = skuId || skus[0]?.id || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateIndianPhone(phone)) {
      pushToast({ message: 'Enter a valid 10-digit Indian mobile number.', tone: 'danger' });
      return;
    }
    await api.submitQuoteRequest({
      name,
      phone,
      email: email || undefined,
      gstin: gstin || undefined,
      items: [{ skuId: effectiveSkuId, qty }],
      message,
    });
    setSent(true);
  };

  return (
    <>
      <Seo route="wholesale" path="/wholesale/quote" config={config} />
      <div className="mx-auto max-w-xl px-4 py-8">
        {sent ? (
          <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-6 shadow-[var(--sh-1)] text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-[var(--success)] mx-auto" aria-hidden="true" />
            <h1 className="font-display text-2xl font-bold text-[var(--ink)]">Quote request logged</h1>
            <p className="text-sm text-[var(--ink-muted)]">Our wholesale desk will respond on phone/email with custom carton pricing.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-6 shadow-[var(--sh-1)] space-y-4">
            <h1 className="font-display text-2xl font-bold text-[var(--ink)]">Request bulk or festive quote</h1>
            <Input label="Contact / Company Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PhoneInput label="Mobile Number" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              <Input label="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Primary SKU"
                value={effectiveSkuId}
                onChange={(e) => setSkuId(e.target.value)}
                options={skus.map((s) => ({ value: s.id, label: `${s.skuCode} (${s.packLabel})` }))}
              />
              <Input
                label="Approx Quantity (packs)"
                type="number"
                min={10}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value) || 10)}
              />
            </div>
            <Input label="GSTIN (optional)" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} className="font-mono uppercase" />
            <Textarea
              label="Delivery city & custom notes"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" fullWidth>
              Send Quote Request
            </Button>
          </form>
        )}
      </div>
    </>
  );
}
