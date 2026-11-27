import { useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../../stores/appContext';
import { useUiStore } from '../../stores/ui';
import { Seo } from '../../seo/Seo';
import { track } from '../../analytics/track';
import { CatalogHeader } from '../../components/shop/CatalogHeader';
import { ProductCard } from '../../components/shop/ProductCard';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { EmptyState, ProductGridSkeleton } from '../../components/ui/States';

function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 2;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

function matchesSearch(haystack: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = haystack.toLowerCase();
  if (hay.includes(q)) return true;
  const tokens = q.split(/\s+/);
  const words = hay.split(/\W+/).filter(Boolean);

  return tokens.every((tok) => {
    if (hay.includes(tok)) return true;
    if (tok.length >= 4 && words.some((w) => editDistance(tok, w) <= 1)) return true;
    return false;
  });
}

export function ShopPage() {
  const { config, catalog, loadingCatalog } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const addRecentSearch = useUiStore((s) => s.addRecentSearch);

  const catRedirect = searchParams.get('cat');
  const qParam = searchParams.get('q') || '';
  const gstParam = searchParams.get('gst') || '';
  const availParam = searchParams.get('stock') || '';
  const sortParam = searchParams.get('sort') || 'featured';

  const [queryInput, setQueryInput] = useState(qParam);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    setQueryInput(qParam);
  }, [qParam]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const trimmed = queryInput.trim();
      const next = new URLSearchParams(searchParams);
      if (trimmed) {
        next.set('q', trimmed);
        addRecentSearch(trimmed);
      } else {
        next.delete('q');
      }
      if (next.toString() !== searchParams.toString()) {
        setSearchParams(next, { replace: true });
        if (trimmed) track('search', { search_term: trimmed }, config);
      }
    }, 260);
    return () => window.clearTimeout(t);
  }, [queryInput]);

  if (catRedirect) {
    return <Navigate to={`/c/${encodeURIComponent(catRedirect)}`} replace />;
  }

  const hasFilterQuery = Boolean(qParam || gstParam || availParam || (sortParam && sortParam !== 'featured'));

  const products = catalog?.products.filter((p) => p.status === 'active') || [];
  const skus = catalog?.skus || [];
  const categories = catalog?.categories || [];

  const filtered = useMemo(() => {
    const list = products.filter((p) => {
      const hay = `${p.name} ${p.description} ${p.ingredients} ${p.synonyms.join(' ')} ${p.searchKeywords.join(' ')}`;
      if (qParam && !matchesSearch(hay, qParam)) return false;
      if (gstParam && String(p.gstRate) !== gstParam) return false;
      if (availParam === 'in_stock') {
        const hasStock = skus.some((s) => s.productId === p.id && s.status === 'active' && s.stockQty > 0);
        if (!hasStock) return false;
      }
      return true;
    });

    const priceOf = (pid: string) => {
      const pSkus = skus.filter((s) => s.productId === pid && s.status === 'active');
      return pSkus.length ? Math.min(...pSkus.map((s) => s.retailPricePaise)) : 0;
    };

    return [...list].sort((a, b) => {
      if (sortParam === 'price_asc') return priceOf(a.id) - priceOf(b.id);
      if (sortParam === 'price_desc') return priceOf(b.id) - priceOf(a.id);
      return Number(b.bestseller) - Number(a.bestseller);
    });
  }, [products, skus, qParam, gstParam, availParam, sortParam]);

  const setFilter = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set(key, val);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  return (
    <>
      <Seo route="shop" path="/shop" hasFilterQuery={hasFilterQuery} config={config} products={filtered} />

      <div className="mx-auto max-w-6xl px-4 py-6 space-y-5">
        <CatalogHeader
          title="All packaged snacks"
          subtitle={`${filtered.length} ${filtered.length === 1 ? 'product' : 'products'} ready for local dispatch or Pan-India shipping`}
          categories={categories}
          city={config.contact.addressParts.city}
          queryValue={queryInput}
          onQueryChange={setQueryInput}
          onOpenFilter={() => setFilterOpen(true)}
        />

        {loadingCatalog ? (
          <ProductGridSkeleton count={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No snacks match those filters"
            body="Try clearing a filter or searching by ingredient like besan, clove, or boondi."
            actionLabel="Reset filters"
            onAction={() => {
              setQueryInput('');
              setSearchParams({}, { replace: true });
            }}
          />
        ) : (
          <section className="reveal grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} skus={skus} config={config} />
            ))}
          </section>
        )}
      </div>

      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter & sort snacks">
        <div className="space-y-5 text-sm">
          <div>
            <p className="font-semibold text-[var(--ink)] mb-2">Sort by</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['featured', 'Featured'],
                ['price_asc', 'Price: Low'],
                ['price_desc', 'Price: High'],
              ].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setFilter('sort', val === 'featured' ? '' : val)}
                  className={`min-h-[44px] rounded-xl border px-2 text-xs font-semibold transition-colors ${
                    sortParam === val
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                      : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink)] hover:bg-[var(--surface-high)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="font-semibold text-[var(--ink)] mb-2">GST Slab</p>
            <div className="flex flex-wrap gap-2">
              {[
                ['', 'All'],
                ['5', '5% GST'],
                ['12', '12% GST'],
              ].map(([val, label]) => (
                <button
                  key={val || 'all'}
                  type="button"
                  onClick={() => setFilter('gst', val)}
                  className={`min-h-[44px] rounded-full border px-4 text-xs font-semibold transition-colors ${
                    gstParam === val
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                      : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink)] hover:bg-[var(--surface-high)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2.5 min-h-[44px] cursor-pointer">
            <input
              type="checkbox"
              checked={availParam === 'in_stock'}
              onChange={(e) => setFilter('stock', e.target.checked ? 'in_stock' : '')}
              className="h-5 w-5 accent-[var(--primary)]"
            />
            <span className="font-medium text-[var(--ink)]">In stock only</span>
          </label>
        </div>
      </BottomSheet>
    </>
  );
}
