import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ChevronRight, ShieldCheck, ShoppingBag } from 'lucide-react';
import { api } from '../../api';
import { useExperience } from '../../experience';
import { PrefetchLink } from '../../experience/tier0/PrefetchLink';
import { flyToCart } from '../../experience/tier0/FlyToCart';
import { triggerHaptic } from '../../experience/tier0/haptics';
import { clearSharedNames } from '../../experience/tier0/transitions';
import { useStore } from '../../stores/appContext';
import { useAuthStore } from '../../stores/auth';
import { useCartStore } from '../../stores/cart';
import { useUiStore } from '../../stores/ui';
import { Seo } from '../../seo/Seo';
import { track } from '../../analytics/track';
import { formatINR, formatWeight, unitPricePer100gPaise } from '../../shared/money';
import type { Category, PriceTier, Product, Sku } from '../../shared/schemas';
import { ImageSlot } from '../../components/ui/ImageSlot';
import { VegMark } from '../../components/ui/VegMark';
import { StockNotice } from '../../components/ui/Badge';
import { SkuChips } from '../../components/ui/SkuChips';
import { PriceBlock } from '../../components/ui/PriceBlock';
import { Stepper } from '../../components/ui/Stepper';
import { Button } from '../../components/ui/Button';
import { PincodeChecker } from '../../components/shop/PincodeChecker';
import { ProductCard } from '../../components/shop/ProductCard';
import { EmptyState, ProductGridSkeleton } from '../../components/ui/States';

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { config, catalog } = useStore();
  const { fxEnabled, reducedMotion } = useExperience();
  const buyer = useAuthStore((s) => s.buyer);
  const isWholesale = Boolean(buyer?.wholesaleStatus === 'approved' && config.features.wholesale);

  const lines = useCartStore((s) => s.lines);
  const addLine = useCartStore((s) => s.addLine);
  const setQty = useCartStore((s) => s.setQty);
  const pushToast = useUiStore((s) => s.pushToast);

  const [data, setData] = useState<{
    product: Product;
    category: Category | null;
    skus: Sku[];
    tiers: PriceTier[];
    redirectedFrom?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedSkuId, setSelectedSkuId] = useState('');

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    setNotFound(false);

    api
      .getProductBySlug(slug)
      .then((res) => {
        if (!active) return;
        setData(res);
        const firstAvail = res.skus.find((s) => s.stockQty > 0) || res.skus[0];
        setSelectedSkuId(firstAvail?.id || '');

        if (firstAvail) {
          const price = isWholesale && firstAvail.wholesalePricePaise ? firstAvail.wholesalePricePaise : firstAvail.retailPricePaise;
          track(
            'view_item',
            {
              currency: 'INR',
              value: price / 100,
              items: [{ item_id: firstAvail.skuCode, item_name: res.product.name, item_variant: firstAvail.packLabel, price: price / 100, quantity: 1 }],
            },
            config
          );
        }
      })
      .catch(() => {
        if (active) setNotFound(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug, isWholesale]);

  useEffect(() => {
    clearSharedNames();
  }, [slug]);

  if (data?.redirectedFrom) {
    return <Navigate to={`/p/${data.product.slug}`} replace />;
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <ProductGridSkeleton count={4} />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12" data-status="404">
        <EmptyState
          title="Product not found"
          body="This namkeen batch may have moved or been archived."
          actionLabel="Back to Shop"
          onAction={() => (window.location.href = '/shop')}
        />
      </div>
    );
  }

  const { product, category, skus, tiers } = data;
  const activeSkus = skus.filter((s) => s.status === 'active');
  const selectedSku = activeSkus.find((s) => s.id === selectedSkuId) || activeSkus[0];

  const activePrice = selectedSku
    ? isWholesale && selectedSku.wholesalePricePaise
      ? selectedSku.wholesalePricePaise
      : selectedSku.retailPricePaise
    : 0;
  const cartQty = selectedSku ? lines.find((l) => l.skuId === selectedSku.id)?.qty || 0 : 0;
  const maxAllowed = selectedSku ? Math.min(selectedSku.stockQty, isWholesale ? 500 : config.maxQtyPerOrder) : 1;

  const skuTiers = selectedSku
    ? tiers.filter((t) => t.skuId === selectedSku.id).sort((a, b) => a.minQty - b.minQty)
    : [];

  const related = (catalog?.products || [])
    .filter((p) => p.status === 'active' && p.id !== product.id)
    .slice(0, 4);

  const handleAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!selectedSku || selectedSku.stockQty <= 0) return;
    const initQty = isWholesale ? selectedSku.wholesaleMoq : 1;
    addLine(selectedSku.id, initQty);
    flyToCart({
      sourceEl: e.currentTarget,
      imageUrl: product.imageUrl,
      fxEnabled,
      reducedMotion,
    });
    triggerHaptic('add', { fxEnabled, reducedMotion });
    track(
      'add_to_cart',
      {
        currency: 'INR',
        value: (activePrice * initQty) / 100,
        items: [{ item_id: selectedSku.skuCode, item_name: product.name, item_variant: selectedSku.packLabel, price: activePrice / 100, quantity: initQty }],
      },
      config
    );
    pushToast({ message: `Added ${product.name} (${selectedSku.packLabel})`, tone: 'success' });
  };

  return (
    <>
      <Seo
        route="product"
        path={`/p/${product.slug}`}
        config={config}
        category={category || undefined}
        product={product}
        skus={activeSkus}
      />

      <div className="mx-auto max-w-6xl px-4 py-6 space-y-10">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--ink-muted)]">
          <PrefetchLink to="/" className="hover:text-[var(--primary)]">Home</PrefetchLink>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <PrefetchLink to="/shop" className="hover:text-[var(--primary)]">Shop</PrefetchLink>
          {category && (
            <>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <PrefetchLink to={`/c/${category.slug}`} className="hover:text-[var(--primary)]">{category.name}</PrefetchLink>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="font-semibold text-[var(--ink)]">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6 lg:sticky lg:top-24 rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-3 shadow-[var(--sh-1)]">
            <ImageSlot
              src={product.imageUrl}
              alt={product.altText || `${product.name} ${selectedSku?.packLabel || ''}`}
              label={product.name}
              aspect="4/3"
              priority
              viewTransitionHero={fxEnabled && !reducedMotion}
              className="w-full rounded-xl"
            />
          </div>

          <div className="lg:col-span-6 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <VegMark veg={product.veg} />
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                  HSN {product.hsnCode} · {product.gstRate}% GST · {product.shelfLifeDays}d Crispness
                </span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-[var(--ink)] leading-tight">
                {product.name}
              </h1>
              <p className="text-sm sm:text-base text-[var(--ink-muted)] leading-relaxed">{product.description}</p>
            </div>

            {activeSkus.length > 0 && selectedSku && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)] mb-2">
                    Select pack size
                  </p>
                  <SkuChips
                    skus={activeSkus}
                    selectedSkuId={selectedSku.id}
                    onSelect={setSelectedSkuId}
                    isWholesale={isWholesale}
                  />
                </div>

                <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-4 shadow-[var(--sh-1)] flex flex-wrap items-center justify-between gap-4">
                  <PriceBlock
                    pricePaise={activePrice}
                    mrpPaise={selectedSku.mrpPaise}
                    isWholesale={isWholesale}
                  />
                  <div className="text-right space-y-1">
                    <StockNotice stockQty={selectedSku.stockQty} lowThreshold={selectedSku.lowStockAt} />
                    <p className="text-xs text-[var(--ink-muted)] tabular-nums">
                      {formatINR(unitPricePer100gPaise(activePrice, selectedSku.netWeightG))} / 100 g
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {selectedSku.stockQty <= 0 ? (
                    <Button variant="secondary" disabled fullWidth>
                      Out of stock
                    </Button>
                  ) : cartQty > 0 ? (
                    <div className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-2.5 shadow-[var(--sh-1)]">
                      <Stepper
                        qty={cartQty}
                        max={maxAllowed}
                        itemName={`${product.name} ${selectedSku.packLabel}`}
                        onChange={(n) => setQty(selectedSku.id, n)}
                      />
                      <Link
                        to="/cart"
                        className="pressable inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] px-5 text-sm font-semibold text-white shadow-[var(--sh-1)] transition-colors whitespace-nowrap shrink-0"
                      >
                        <ShoppingBag className="h-4 w-4 text-[var(--on-primary-container)]" aria-hidden="true" />
                        <span>Go to cart</span>
                      </Link>
                    </div>
                  ) : (
                    <Button variant="primary" size="lg" fullWidth onClick={handleAdd}>
                      Add {isWholesale ? `${selectedSku.wholesaleMoq} packs` : selectedSku.packLabel} · {formatINR(activePrice * (isWholesale ? selectedSku.wholesaleMoq : 1))}
                    </Button>
                  )}
                </div>

                {/* Clean-Label Botanical Pistachio Guarantee Card */}
                <div className="rounded-xl bg-[var(--accent-soft)] p-3.5 flex items-start gap-3 text-[var(--on-secondary-container)]">
                  <ShieldCheck className="h-5 w-5 text-[var(--accent)] shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="text-xs leading-snug">
                    <p className="font-semibold text-[var(--on-secondary-fixed)]">Zero Palm Oil · Clean-Label Guarantee</p>
                    <p className="mt-0.5">
                      Fried in pure cold-pressed oil &amp; sealed within hours in food-grade nitrogen barrier pouches.
                    </p>
                  </div>
                </div>

                <PincodeChecker config={config} weightG={selectedSku.shipWeightG} />

                {isWholesale && skuTiers.length > 0 && (
                  <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-4 shadow-[var(--sh-1)] space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--secondary)]">
                      Wholesale Volume Slabs (excl. GST)
                    </p>
                    <table className="w-full text-sm tabular-nums">
                      <thead>
                        <tr className="border-b border-[var(--border-soft)] text-left text-xs text-[var(--ink-muted)]">
                          <th className="py-1.5">Min Quantity</th>
                          <th className="py-1.5 text-right">Unit Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {skuTiers.map((t) => (
                          <tr key={t.id} className="border-b border-[var(--border-soft)] last:border-0">
                            <td className="py-1.5">{t.minQty}+ packs</td>
                            <td className="py-1.5 text-right font-semibold">{formatINR(t.pricePaise)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {!isWholesale && config.features.wholesale && (
                  <p className="text-xs text-[var(--ink-muted)]">
                    Buying in bulk for retail or events?{' '}
                    <Link to="/wholesale" className="font-semibold text-[var(--primary)] underline">
                      Sign in or apply for wholesale pricing
                    </Link>
                    .
                  </p>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-4">
              <h2 className="font-display text-lg font-bold text-[var(--ink)]">Quick pack facts</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                <div>
                  <dt className="text-xs text-[var(--ink-muted)]">Ingredients</dt>
                  <dd className="font-medium text-[var(--ink)]">{product.ingredients}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--ink-muted)]">Allergens</dt>
                  <dd className="font-medium text-[var(--ink)]">{product.allergens}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--ink-muted)]">Shelf life</dt>
                  <dd className="font-medium text-[var(--ink)]">{product.shelfLifeDays} days (unopened)</dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--ink-muted)]">Storage</dt>
                  <dd className="font-medium text-[var(--ink)]">{product.storage}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--ink-muted)]">GST &amp; HSN</dt>
                  <dd className="font-medium text-[var(--ink)] tabular-nums">{product.gstRate}% GST · HSN {product.hsnCode}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--ink-muted)]">Packed by</dt>
                  <dd className="font-medium text-[var(--ink)]">{config.legal.legalName}</dd>
                </div>
              </dl>

              <div className="overflow-x-auto pt-2">
                <table className="w-full text-sm tabular-nums border-t border-[var(--border-soft)]">
                  <thead>
                    <tr className="text-left text-xs text-[var(--ink-muted)] border-b border-[var(--border-soft)]">
                      <th className="py-2">Pack</th>
                      <th className="py-2">Net Weight</th>
                      <th className="py-2 text-right">Retail Price</th>
                      <th className="py-2 text-right">Per 100 g</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSkus.map((s) => (
                      <tr key={s.id} className="border-b border-[var(--border-soft)] last:border-0">
                        <td className="py-2 font-medium">{s.packLabel}</td>
                        <td className="py-2 text-[var(--ink-muted)]">{formatWeight(s.netWeightG)}</td>
                        <td className="py-2 text-right font-semibold">{formatINR(s.retailPricePaise)}</td>
                        <td className="py-2 text-right text-[var(--ink-muted)]">
                          {formatINR(unitPricePer100gPaise(s.retailPricePaise, s.netWeightG))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {product.faq.length > 0 && (
              <div className="space-y-2">
                <h2 className="font-display text-lg font-bold text-[var(--ink)]">Common questions</h2>
                {product.faq.map((item, idx) => (
                  <details key={idx} className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] px-4 py-3 text-sm shadow-[var(--sh-1)]">
                    <summary className="cursor-pointer font-semibold text-[var(--ink)]">{item.q}</summary>
                    <p className="mt-2 text-[var(--ink-muted)]">{item.a}</p>
                  </details>
                ))}
              </div>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <section className="reveal cv-auto space-y-4 pt-6 border-t border-[var(--border-soft)]/70">
            <h2 className="font-display text-2xl font-bold text-[var(--ink)]">You may also like</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} skus={catalog?.skus || []} config={config} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
