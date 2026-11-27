import { formatINR } from '../../shared/money';

export function PriceBlock({
  pricePaise,
  mrpPaise,
  isWholesale = false,
  compact = false,
}: {
  pricePaise: number;
  mrpPaise?: number;
  isWholesale?: boolean;
  compact?: boolean;
}) {
  const hasSavings = typeof mrpPaise === 'number' && mrpPaise > pricePaise;
  const savings = hasSavings ? mrpPaise! - pricePaise : 0;

  return (
    <div className="space-y-0.5">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className={`font-bold tabular-nums text-[var(--primary)] ${compact ? 'text-base' : 'text-xl'}`}>
          {formatINR(pricePaise)}
        </span>
        {hasSavings && (
          <span className="text-xs tabular-nums line-through text-[var(--ink-muted)]">
            MRP {formatINR(mrpPaise!)}
          </span>
        )}
      </div>
      {hasSavings && !compact && (
        <p className="text-xs font-medium text-[var(--success)] tabular-nums">
          You save {formatINR(savings)}
        </p>
      )}
      <p className="text-xs text-[var(--ink-muted)]">
        {isWholesale ? 'excl. GST, GST added at checkout' : 'incl. taxes'}
      </p>
    </div>
  );
}
