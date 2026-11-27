import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { PrefetchLink } from '../../experience/tier0/PrefetchLink';
import { useStore } from '../../stores/appContext';
import { Seo } from '../../seo/Seo';
import { CatalogHeader } from '../../components/shop/CatalogHeader';
import { ProductCard } from '../../components/shop/ProductCard';
import { EmptyState, ProductGridSkeleton } from '../../components/ui/States';

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { config, catalog, loadingCatalog } = useStore();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');

  const categories = catalog?.categories || [];
  const category = categories.find((c) => c.slug === slug);
  const products = catalog?.products.filter((p) => p.status === 'active' && p.categoryId === category?.id) || [];
  const skus = catalog?.skus || [];

  if (!loadingCatalog && !category) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12" data-status="404">
        <EmptyState
          title="Category not found"
          body="This snack category may have been renamed or archived."
          actionLabel="Browse all snacks"
          onAction={() => navigate('/shop')}
        />
      </div>
    );
  }

  return (
    <>
      {category && (
        <Seo
          route="category"
          path={`/c/${category.slug}`}
          config={config}
          category={category}
          products={products}
        />
      )}

      <div className="mx-auto max-w-6xl px-4 py-6 space-y-5">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)]">
          <PrefetchLink to="/" className="hover:text-[var(--primary)]">Home</PrefetchLink>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <PrefetchLink to="/shop" className="hover:text-[var(--primary)]">Shop</PrefetchLink>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="font-semibold text-[var(--ink)]">{category?.name || 'Category'}</span>
        </nav>

        <CatalogHeader
          title={category?.name || 'Loading…'}
          subtitle={category?.description || `${products.length} small-batch recipes ready to dispatch`}
          categories={categories}
          activeCategorySlug={slug}
          city={config.contact.addressParts.city}
          queryValue={searchInput}
          onQueryChange={setSearchInput}
          onSubmitSearch={(q) => navigate(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : '/shop')}
        />

        {loadingCatalog ? (
          <ProductGridSkeleton count={4} />
        ) : products.length === 0 ? (
          <EmptyState
            title="No active products in this category"
            body="Check our full snack catalogue for freshly packed batches."
            actionLabel="View all batches"
            onAction={() => navigate('/shop')}
          />
        ) : (
          <section className="reveal grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} skus={skus} config={config} />
            ))}
          </section>
        )}
      </div>
    </>
  );
}
