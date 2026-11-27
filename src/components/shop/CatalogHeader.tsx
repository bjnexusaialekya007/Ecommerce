import { Filter, Flame, Search, X } from 'lucide-react';
import { PrefetchLink } from '../../experience/tier0/PrefetchLink';
import type { Category } from '../../shared/schemas';

export function CatalogHeader({
  title,
  subtitle,
  categories,
  activeCategorySlug,
  city,
  queryValue,
  onQueryChange,
  onSubmitSearch,
  onOpenFilter,
}: {
  title: string;
  subtitle: string;
  categories: Category[];
  activeCategorySlug?: string;
  city: string;
  queryValue: string;
  onQueryChange: (val: string) => void;
  onSubmitSearch?: (val: string) => void;
  onOpenFilter?: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[var(--ink)]">{title}</h1>
          <p className="text-sm text-[var(--ink-muted)] mt-1">{subtitle}</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmitSearch?.(queryValue);
          }}
          className="flex items-center gap-2 w-full sm:w-auto"
        >
          <div className="relative flex-1 sm:w-72">
            <Search
              className="h-4 w-4 text-[var(--ink-muted)] absolute left-3.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Search packaged snacks"
              value={queryValue}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search roasted grains, sev, bhujia…"
              className="min-h-[44px] w-full rounded-full border border-[var(--border)] bg-[var(--surface)] pl-10 pr-8 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]/70 shadow-[var(--sh-1)] focus:border-[var(--primary)]"
            />
            {queryValue && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => onQueryChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--ink-muted)]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {onOpenFilter && (
            <button
              type="button"
              onClick={onOpenFilter}
              className="pressable inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--ink)] shadow-[var(--sh-1)] hover:bg-[var(--surface-low)] shrink-0 whitespace-nowrap"
            >
              <Filter className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
              <span>Filter</span>
            </button>
          )}
        </form>
      </div>

      <div className="sticky top-16 z-20 -mx-4 px-4 py-2.5 bg-[var(--bg)]/95 backdrop-blur-sm border-b border-[var(--border-soft)] flex gap-2 overflow-x-auto">
        <PrefetchLink
          to="/shop"
          className={`shrink-0 inline-flex min-h-[40px] items-center rounded-full px-4 text-xs font-semibold transition-colors whitespace-nowrap ${
            !activeCategorySlug
              ? 'bg-[var(--primary)] text-white shadow-[var(--sh-1)]'
              : 'bg-[var(--surface-2)] text-[var(--ink)] hover:bg-[var(--surface-high)]'
          }`}
        >
          All Batches
        </PrefetchLink>
        {categories.map((c, idx) => {
          const isActive = activeCategorySlug === c.slug;
          return (
            <PrefetchLink
              key={c.id}
              to={`/c/${c.slug}`}
              className={`shrink-0 inline-flex min-h-[40px] items-center rounded-full px-4 text-xs font-semibold transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-[var(--primary)] text-white shadow-[var(--sh-1)]'
                  : idx % 2 === 1
                  ? 'bg-[var(--accent-soft)] text-[var(--on-secondary-container)] hover:brightness-95'
                  : 'bg-[var(--surface-2)] text-[var(--ink)] hover:bg-[var(--surface-high)]'
              }`}
            >
              {c.name}
            </PrefetchLink>
          );
        })}
      </div>

      <div className="rounded-xl bg-[var(--accent-soft)] px-4 py-3 flex items-center gap-3 text-[var(--on-secondary-container)] shadow-[var(--sh-1)]">
        <div className="h-9 w-9 rounded-lg bg-[var(--surface)]/80 text-[var(--accent)] flex items-center justify-center shrink-0">
          <Flame className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
            Small-Batch Kitchen · {city}
          </p>
          <p className="text-xs leading-snug text-[var(--on-secondary-container)]">
            Stone-ground spices &amp; cold-pressed groundnut oil packed fresh daily in nitrogen barrier pouches.
          </p>
        </div>
      </div>
    </div>
  );
}
