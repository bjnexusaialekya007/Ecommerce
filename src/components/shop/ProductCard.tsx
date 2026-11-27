import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import type { ClientConfig } from '../../config/schema';
import type { Product, Sku } from '../../shared/schemas';
import { formatINR } from '../../shared/money';
import { useExperience } from '../../experience';
import { PrefetchLink } from '../../experience/tier0/PrefetchLink';
import { flyToCart } from '../../experience/tier0/FlyToCart';
import { triggerHaptic } from '../../experience/tier0/haptics';
import { useCartStore } from '../../stores/cart';
import { useAuthStore } from '../../stores/auth';
import { useUiStore } from '../../stores/ui';
import { track } from '../../analytics/track';
import { ImageSlot } from '../ui/ImageSlot';
import { VegMark } from '../ui/VegMark';
import { StockNotice } from '../ui/Badge';
import { PriceBlock } from '../ui/PriceBlock';
import { Stepper } from '../ui/Stepper';
import { BottomSheet } from '../ui/BottomSheet';
import { SkuChips } from '../ui/SkuChips';
import { Button } from '../ui/Button';

export function ProductCard({
  product,
  skus,
  config,
}: {
  product: Product;
  skus: Sku[];
  config: ClientConfig;
}) {
  const { fxEnabled, reducedMotion } = useExperience();
  const buyer = useAuthStore((s) => s.buyer);
  const isWholesale = Boolean(buyer?.wholesaleStatus === 'approved' && config.features.wholesale);
  const lines = useCartStore((s) => s.lines);
  const addLine = useCartStore((s) => s.addLine);
  const setQty = useCartStore((s) => s.setQty);
  const pushToast = useUiStore((s) => s.pushToast);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  const activeSkus = skus.filter((s) => s.productId === product.id && s.status === 'active');
  const defaultSku = activeSkus.find((s) => s.stockQty > 0) || activeSkus[0];
  const [selectedSkuId, setSelectedSkuId] = useState<string>(defaultSku?.id || '');
  const [packSheetOpen, setPackSheetOpen] = useState(false);

  const selectedSku = activeSkus.find((s) => s.id === selectedSkuId) || defaultSku;
  if (!selectedSku) return null;

  const cartQty = lines.find((l) => l.skuId === selectedSku.id)?.qty || 0;
  const minPrice = Math.min(
    ...activeSkus.map((s) => (isWholesale && s.wholesalePricePaise ? s.wholesalePricePaise : s.retailPricePaise))
  );
  const allOut = activeSkus.every((s) => s.stockQty <= 0);
  const activePrice =
    isWholesale && selectedSku.wholesalePricePaise ? selectedSku.wholesalePricePaise : selectedSku.retailPricePaise;
  const maxAllowed = Math.min(selectedSku.stockQty, isWholesale ? 500 : config.maxQtyPerOrder);

  const triggerAddEffects = (sourceEl: HTMLElement | null) => {
    flyToCart({
      sourceEl,
      imageUrl: product.imageUrl,
      fxEnabled,
      reducedMotion,
    });
    triggerHaptic('add', { fxEnabled, reducedMotion });
  };

  const handleQuickAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (selectedSku.stockQty <= 0) return;
    if (activeSkus.length > 1 && !packSheetOpen && cartQty === 0) {
      setPackSheetOpen(true);
      return;
    }
    const initQty = isWholesale ? selectedSku.wholesaleMoq : 1;
    addLine(selectedSku.id, initQty);
    triggerAddEffects(e.currentTarget);
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
      <article className="contain-card group hover-lift flex flex-col justify-between rounded-2xl border border-[var(--border-soft)]/70 hover:border-[var(--accent-border)] bg-[var(--surface)] p-3 shadow-[var(--sh-1)] transition-colors">
        <div>
          <PrefetchLink to={`/p/${product.slug}`} sharedProductImage className="block relative">
            <ImageSlot
              src={product.imageUrl}
              alt={`${product.name} (${selectedSku.packLabel})`}
              label={product.name}
              aspect="4/3"
              sharedProductImage
              className="w-full rounded-xl"
            />
            <div className="absolute top-2 left-2 z-[3] flex items-center gap-1.5 rounded-md bg-[var(--surface)]/95 px-1.5 py-1 shadow-xs">
              <VegMark veg={product.veg} />
            </div>
            {product.bestseller && (
              <span className="absolute top-2 right-2 z-[3] rounded-md bg-[var(--accent-soft)] border border-[var(--accent-border)] px-2 py-0.5 text-[11px] font-semibold tracking-wide text-[var(--accent)] shadow-xs">
                Bestseller
              </span>
            )}
          </PrefetchLink>

          <div className="mt-3 space-y-1.5">
            <PrefetchLink to={`/p/${product.slug}`} className="block focus:outline-none">
              <h3 className="font-display text-base font-bold leading-snug text-[var(--ink)] line-clamp-2 group-hover:text-[var(--primary)] transition-colors">
                {product.name}
              </h3>
            </PrefetchLink>

            <p className="text-xs text-[var(--ink-muted)] line-clamp-2 leading-relaxed">
              {product.description}
            </p>

            <StockNotice stockQty={selectedSku.stockQty} lowThreshold={5} />
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-[var(--border-soft)]/50">
          {allOut ? (
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-sm tabular-nums text-[var(--ink-muted)]">
                {formatINR(minPrice)}
              </span>
              <Button variant="secondary" size="sm" disabled>
                Sold out
              </Button>
            </div>
          ) : cartQty > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Stepper
                  qty={cartQty}
                  max={maxAllowed}
                  itemName={`${product.name} ${selectedSku.packLabel}`}
                  onChange={(next) => {
                    if (isWholesale && next > 0 && next < selectedSku.wholesaleMoq) {
                      setQty(selectedSku.id, 0);
                      return;
                    }
                    setQty(selectedSku.id, next);
                  }}
                />
                {activeSkus.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setPackSheetOpen(true)}
                    className="text-xs font-semibold text-[var(--primary)] underline underline-offset-2 min-h-[44px] px-1 whitespace-nowrap shrink-0"
                  >
                    {selectedSku.packLabel}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-lg leading-tight tabular-nums text-[var(--primary)]">
                  {formatINR(activeSkus.length > 1 ? minPrice : activePrice)}
                </p>
                <p className="text-[11px] text-[var(--ink-muted)] tabular-nums truncate">
                  {activeSkus.length > 1 ? `${activeSkus.length} packs` : `${selectedSku.packLabel} net`}
                </p>
              </div>
              <button
                ref={addBtnRef}
                type="button"
                onClick={handleQuickAdd}
                aria-label={activeSkus.length > 1 ? `Choose pack for ${product.name}` : `Add ${product.name} to cart`}
                className="pressable inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-full bg-[var(--primary)] px-3.5 text-xs font-semibold text-white hover:bg-[var(--primary-hover)] shadow-[var(--sh-1)] whitespace-nowrap shrink-0 transition-colors"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>{activeSkus.length > 1 ? 'Pack' : 'Add'}</span>
              </button>
            </div>
          )}
        </div>
      </article>

      <BottomSheet
        open={packSheetOpen}
        onClose={() => setPackSheetOpen(false)}
        title={`Choose pack · ${product.name}`}
      >
        <div className="space-y-4">
          <SkuChips
            skus={activeSkus}
            selectedSkuId={selectedSku.id}
            onSelect={setSelectedSkuId}
            isWholesale={isWholesale}
          />
          <div className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] p-3.5">
            <PriceBlock pricePaise={activePrice} mrpPaise={selectedSku.mrpPaise} isWholesale={isWholesale} />
            <StockNotice stockQty={selectedSku.stockQty} lowThreshold={5} />
          </div>
          {isWholesale && selectedSku.wholesaleMoq > 1 && (
            <p className="text-xs text-[var(--ink-muted)]">
              Wholesale minimum order: {selectedSku.wholesaleMoq} packs.
            </p>
          )}
          {selectedSku.stockQty <= 0 ? (
            <Button variant="secondary" disabled fullWidth>
              Out of stock
            </Button>
          ) : cartQty > 0 ? (
            <div className="flex items-center justify-between">
              <Stepper
                qty={cartQty}
                max={maxAllowed}
                itemName={`${product.name} ${selectedSku.packLabel}`}
                onChange={(next) => setQty(selectedSku.id, next)}
              />
              <Button variant="primary" onClick={() => setPackSheetOpen(false)}>
                Done
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              fullWidth
              onClick={(e) => {
                const initQty = isWholesale ? selectedSku.wholesaleMoq : 1;
                addLine(selectedSku.id, initQty);
                triggerAddEffects(addBtnRef.current || e.currentTarget);
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
                setPackSheetOpen(false);
              }}
            >
              Add {isWholesale ? `${selectedSku.wholesaleMoq} packs` : 'to cart'} · {formatINR(activePrice * (isWholesale ? selectedSku.wholesaleMoq : 1))}
            </Button>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
