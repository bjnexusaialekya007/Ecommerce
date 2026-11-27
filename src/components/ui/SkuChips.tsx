import { formatINR, unitPricePer100gPaise } from '../../shared/money';
import type { Sku } from '../../shared/schemas';

/**
 * Paper-label pack chips with memorable per-100 g unit price (Section J1 #1 + K1 #3).
 */
export function SkuChips({
  skus,
  selectedSkuId,
  onSelect,
  isWholesale = false,
}: {
  skus: Sku[];
  selectedSkuId: string;
  onSelect: (skuId: string) => void;
  isWholesale?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Pack size">
      {skus.map((sku) => {
        const selected = sku.id === selectedSkuId;
        const activePrice = isWholesale && sku.wholesalePricePaise ? sku.wholesalePricePaise : sku.retailPricePaise;
        const per100 = unitPricePer100gPaise(activePrice, sku.netWeightG);
        return (
          <button
            key={sku.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(sku.id)}
            className={`pressable min-h-[44px] rounded-xl border px-3.5 py-1.5 text-left transition-colors duration-[var(--dur-fast)] ${
              selected
                ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-[var(--sh-1)]'
                : 'bg-[var(--surface-2)] text-[var(--ink)] border-[var(--border)] hover:bg-[var(--surface-high)]'
            }`}
          >
            <span className="block text-sm font-semibold leading-tight">{sku.packLabel}</span>
            <span className={`block text-[11px] tabular-nums leading-tight ${selected ? 'text-[var(--on-primary-container)]' : 'text-[var(--ink-muted)]'}`}>
              {formatINR(per100)} / 100 g
            </span>
          </button>
        );
      })}
    </div>
  );
}
