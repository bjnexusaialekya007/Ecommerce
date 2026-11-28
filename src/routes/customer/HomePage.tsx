import { lazy, Suspense, useEffect, useRef } from 'react';
import { ArrowRight, ShieldCheck, Truck, Store, PackageCheck } from 'lucide-react';
import { useExperience } from '../../experience';
import { PrefetchLink } from '../../experience/tier0/PrefetchLink';
import { useStore } from '../../stores/appContext';
import { useAuthStore } from '../../stores/auth';
import { useLangStore, t } from '../../i18n';
import { Seo } from '../../seo/Seo';
import { getShopStatus } from '../../shared/calendar';
import { formatAddress } from '../../shared/address';
import { ProductCard } from '../../components/shop/ProductCard';
import { PincodeChecker } from '../../components/shop/PincodeChecker';
import { ContactActions } from '../../components/ui/ContactActions';
import { ImageSlot } from '../../components/ui/ImageSlot';
import { ExperienceHost } from '../../experience/ExperienceHost';

const LazyStory = lazy(() => import('../../experience/tier1/Story'));

export function HomePage() {
  const { config, catalog } = useStore();
  const { tier } = useExperience();
  const buyer = useAuthStore((s) => s.buyer);
  const lang = useLangStore((s) => s.lang);
  const shop = getShopStatus(config);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (tier < 1 || !config.features.experience || config.experience.hero !== 'text') return;
    let cleanup: (() => void) | undefined;
    import('../../experience/tier1/HeroText')
      .then((m) => {
        cleanup = m.animateHeroText(headingRef.current);
      })
      .catch(() => {});
    return () => cleanup?.();
  }, [tier, config.features.experience, config.experience.hero]);

  const products = catalog?.products.filter((p) => p.status === 'active') || [];
  const skus = catalog?.skus || [];
  const activeSkuCount = skus.filter((s) => s.status === 'active').length;
  const maxShelfLife = products.length ? Math.max(...products.map((p) => p.shelfLifeDays)) : 90;
  const categories = catalog?.categories || [];
  const bestsellers = products.filter((p) => p.bestseller).slice(0, 4);

  return (
    <>
      <Seo route="home" path="/" config={config} products={products} />

      {/* Hero Section: Static image always paints immediately as LCP; ExperienceHost layers on top after idle */}
      <section className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:pt-10 sm:pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-border)] px-3 py-1.5 text-xs font-semibold tracking-wide text-[var(--on-secondary-fixed)]">
              <span>{config.contact.addressParts.city} Heritage Kitchen</span>
              <span aria-hidden="true" className="text-[var(--accent)]">·</span>
              <span>Est. 1984</span>
              <span aria-hidden="true" className="text-[var(--accent)]">·</span>
              <span className={shop.isOpenNow ? 'text-[var(--accent)] font-bold' : 'text-[var(--danger)]'}>
                {shop.isOpenNow ? 'Open for dispatch' : 'Closed now'}
              </span>
            </div>

            <h1 ref={headingRef} className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-[var(--ink)] leading-[1.08]">
              {lang === 'te' ? t('hero.headline') : config.brand.tagline}
            </h1>

            <p className="text-base sm:text-lg text-[var(--ink-muted)] leading-relaxed max-w-xl">
              {config.copy.announcement || 'Small-batch Bikaneri bhujia, Ratlami sev, and regional mixtures sealed within hours in nitrogen pouches.'}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <PrefetchLink
                to="/shop"
                className="pressable inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[var(--primary)] px-6 text-base font-semibold text-white hover:bg-[var(--primary-hover)] shadow-[var(--sh-1)] transition-colors whitespace-nowrap shrink-0"
              >
                <span>{t('hero.primaryCta')}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </PrefetchLink>

              {config.features.wholesale && (
                <PrefetchLink
                  to={buyer?.wholesaleStatus === 'approved' ? '/account' : '/wholesale'}
                  className="pressable inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-high)] px-5 text-sm font-semibold text-[var(--ink)] transition-colors whitespace-nowrap shrink-0"
                >
                  {t('hero.secondaryCta')}
                </PrefetchLink>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-[var(--border-soft)] text-xs font-medium text-[var(--ink)]">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)] shrink-0">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>FSSAI Certified</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)] shrink-0">
                  <PackageCheck className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>Sealed Nitrogen Packs</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)] shrink-0">
                  <Truck className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>Pan-India Courier</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <ExperienceHost
              enabled={config.features.experience}
              heroMode={config.experience.hero}
              heroModelUrl={config.experience.heroModelUrl}
              pauseControl={config.experience.pauseControl}
              heroImageUrl={config.experience.posterUrl}
              heroAlt={`${config.brand.name} artisan namkeen bowls`}
            />
          </div>
        </div>
      </section>

      {/* Kitchen Craft Proof Bar */}
      <section className="mx-auto max-w-6xl px-4 pb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-4 sm:p-5 shadow-[var(--sh-1)] tabular-nums items-center">
          <div className="space-y-0.5 px-2">
            <p className="font-display text-2xl sm:text-3xl font-bold text-[var(--primary)]">{products.length}</p>
            <p className="text-xs text-[var(--ink-muted)]">Small-batch namkeen recipes</p>
          </div>
          <div className="space-y-0.5 px-2">
            <p className="font-display text-2xl sm:text-3xl font-bold text-[var(--primary)]">{activeSkuCount}</p>
            <p className="text-xs text-[var(--ink-muted)]">Nitrogen-sealed pack SKUs</p>
          </div>
          <div className="space-y-0.5 px-2">
            <p className="font-display text-2xl sm:text-3xl font-bold text-[var(--primary)]">{maxShelfLife} days</p>
            <p className="text-xs text-[var(--ink-muted)]">Unopened crispness shelf life</p>
          </div>
          <div className="space-y-0.5 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-border)] px-3.5 py-2.5">
            <p className="font-display text-2xl sm:text-3xl font-bold text-[var(--accent)]">100%</p>
            <p className="text-xs font-medium text-[var(--on-secondary-fixed)]">Cold-pressed groundnut oil</p>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="reveal cv-auto mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Shop by Craft</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[var(--ink)]">
              {t('home.categoriesHeading')}
            </h2>
          </div>
          <PrefetchLink to="/shop" className="text-sm font-semibold text-[var(--primary)] hover:underline whitespace-nowrap shrink-0">
            View full catalogue
          </PrefetchLink>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {categories.map((cat) => {
            const catImg = products.find((p) => p.categoryId === cat.id)?.imageUrl;
            const catCount = products.filter((p) => p.categoryId === cat.id).length;
            return (
              <PrefetchLink
                key={cat.id}
                to={`/c/${cat.slug}`}
                className="contain-card group pressable hover-lift block rounded-2xl border border-[var(--border-soft)]/70 hover:border-[var(--accent-border)] bg-[var(--surface)] p-3 shadow-[var(--sh-1)] transition-colors"
              >
                <ImageSlot src={catImg} alt={cat.name} label={cat.name} aspect="4/3" />
                <div className="mt-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-display text-base font-bold text-[var(--ink)] group-hover:text-[var(--primary)] transition-colors">
                      {cat.name}
                    </h3>
                    <span className="text-[11px] font-semibold text-[var(--accent)] shrink-0 tabular-nums">
                      {catCount} {catCount === 1 ? 'batch' : 'batches'}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--ink-muted)] line-clamp-2 mt-0.5">{cat.description}</p>
                </div>
              </PrefetchLink>
            );
          })}
        </div>
      </section>

      {/* Bestsellers */}
      <section className="reveal cv-auto mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Customer Favourites</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[var(--ink)]">
              {t('home.bestSellersHeading')}
            </h2>
          </div>
          <PrefetchLink to="/shop" className="text-sm font-semibold text-[var(--primary)] hover:underline">
            Shop all packs
          </PrefetchLink>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {bestsellers.map((p) => (
            <ProductCard key={p.id} product={p} skus={skus} config={config} />
          ))}
        </div>
      </section>

      {/* How Ordering Works (Lazy Tier 1 GSAP Story when tier >= 1, static fallback inside) */}
      <Suspense fallback={null}>
        <LazyStory enabled={tier >= 1 && config.features.experience && config.experience.story} />
      </Suspense>

      {/* Delivery & All-India Pincode Check */}
      <section className="reveal cv-auto mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-6 shadow-[var(--sh-1)] grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-6 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Delivery &amp; Pickup</p>
            <h2 className="font-display text-2xl font-bold text-[var(--ink)]">
              Local same-day vans &amp; all-India courier
            </h2>
            <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
              Check your 6-digit pincode for same-day local routes in {config.contact.addressParts.city}, weight-based insured national shipping, or free counter pickup at our flagship shop.
            </p>
            <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)] pt-1">
              <Store className="h-4 w-4 text-[var(--primary)] shrink-0" aria-hidden="true" />
              <span>Pickup point: {formatAddress(config)}</span>
            </div>
          </div>
          <div className="lg:col-span-6">
            <PincodeChecker config={config} />
          </div>
        </div>
      </section>

      {/* Wholesale Banner */}
      {config.features.wholesale && (
        <section className="reveal cv-auto mx-auto max-w-6xl px-4 py-6">
          <div className="rounded-2xl bg-[var(--ink)] text-white p-6 sm:p-8 shadow-[var(--sh-2)] flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent-soft)]">
                B2B · Kirana · Corporate Gifting
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold">
                Bulk tins, tiered wholesale slabs &amp; GST input tax invoices
              </h2>
              <p className="text-sm text-white/80">
                Apply once with your GSTIN to unlock factory-direct wholesale rates, volume discounts on 10+ and 25+ packs, and automated CGST/SGST or IGST tax invoices.
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 text-xs font-medium text-[var(--accent-soft)]">
                <span>Zero palm oil</span>
                <span aria-hidden="true">·</span>
                <span>GST Input Credit Invoices</span>
                <span aria-hidden="true">·</span>
                <span>Dispatched within {config.dispatchDays} working days</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <PrefetchLink
                to={buyer?.wholesaleStatus === 'approved' ? '/account' : '/wholesale'}
                className="pressable inline-flex min-h-[48px] items-center rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] px-5 text-sm font-bold text-white shadow-sm transition-colors whitespace-nowrap shrink-0"
              >
                {buyer?.wholesaleStatus === 'approved' ? 'Open Wholesale Portal' : 'Apply for Wholesale'}
              </PrefetchLink>
              <PrefetchLink
                to="/wholesale/quote"
                className="pressable inline-flex min-h-[48px] items-center rounded-xl border border-white/25 px-5 text-sm font-semibold text-white hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
              >
                Request Custom Quote
              </PrefetchLink>
            </div>
          </div>
        </section>
      )}

      {/* Optional Reviews ONLY when configured (Never invented — Section F1/N1) */}
      {config.reviews.length > 0 && (
        <section className="reveal cv-auto mx-auto max-w-6xl px-4 py-8">
          <h2 className="font-display text-2xl font-bold text-[var(--ink)] mb-4">Verified customer notes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {config.reviews.map((r, idx) => (
              <blockquote
                key={idx}
                className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-2"
              >
                <p className="text-sm text-[var(--ink)]">&ldquo;{r.text}&rdquo;</p>
                <footer className="text-xs font-semibold text-[var(--ink-muted)]">
                  — {r.author} · {r.rating}/5
                </footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/* Direct Store Contact & Hours */}
      <section className="reveal cv-auto mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-6 shadow-[var(--sh-1)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Kitchen Desk &amp; Counter Pickup</p>
              <h2 className="font-display text-xl font-bold text-[var(--ink)] mt-0.5">Visit or call our kitchen desk</h2>
              <p className="text-sm text-[var(--ink-muted)]">
                {formatAddress(config)}
              </p>
            </div>
            <span className="inline-flex self-start items-center rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-border)] px-3 py-1.5 text-xs font-semibold text-[var(--on-secondary-fixed)]">
              {shop.nextOpenText}
            </span>
          </div>
          <ContactActions config={config} context="home" />
        </div>
      </section>
    </>
  );
}
