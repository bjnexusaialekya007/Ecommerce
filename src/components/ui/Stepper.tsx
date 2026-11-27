import { m } from 'motion/react';
import { Minus, Plus } from 'lucide-react';
import { STEPPER_SPRING } from '../../shared/motion';

export function Stepper({
  qty,
  min = 0,
  max = 50,
  itemName,
  onChange,
}: {
  qty: number;
  min?: number;
  max?: number;
  itemName: string;
  onChange: (nextQty: number) => void;
}) {
  return (
    <m.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={STEPPER_SPRING}
      className="inline-flex items-center rounded-full border border-[var(--border-soft)]/70 bg-[var(--surface-2)]"
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, qty - 1))}
        aria-label={`Decrease quantity for ${itemName}`}
        className="pressable inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-l-full text-[var(--primary)] hover:bg-[var(--surface-high)]"
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <span
        className="min-w-[26px] text-center text-sm font-bold tabular-nums text-[var(--ink)]"
        aria-live="polite"
      >
        {qty}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, qty + 1))}
        disabled={qty >= max}
        aria-label={`Increase quantity for ${itemName}`}
        className="pressable inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-r-full text-[var(--primary)] hover:bg-[var(--surface-high)] disabled:opacity-40"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </m.div>
  );
}
