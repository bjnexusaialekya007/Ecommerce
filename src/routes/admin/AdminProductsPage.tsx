import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, Upload, Save } from 'lucide-react';
import { api } from '../../api';
import { useStore } from '../../stores/appContext';
import { useUiStore } from '../../stores/ui';
import { formatINR } from '../../shared/money';
import type { Product, Sku } from '../../shared/schemas';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';

export function AdminProductsPage() {
  const { catalog } = useStore();
  const products = catalog?.products || [];
  const skus = catalog?.skus || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-[var(--ink)]">Products &amp; SKUs ({products.length})</h1>
        <Link
          to="/admin/products/new"
          className="pressable inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] px-4 text-sm font-semibold text-white transition-colors"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Product
        </Link>
      </div>

      <div className="space-y-3">
        {products.map((p) => {
          const pSkus = skus.filter((s) => s.productId === p.id);
          return (
            <div
              key={p.id}
              className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-4 shadow-[var(--sh-1)] flex flex-wrap items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <p className="font-bold text-[var(--ink)]">{p.name}</p>
                <p className="text-xs text-[var(--ink-muted)] font-mono">
                  /{p.slug} · HSN {p.hsnCode} · {p.gstRate}% GST · {pSkus.length} SKUs
                </p>
                <div className="flex flex-wrap gap-2 pt-1 text-xs tabular-nums">
                  {pSkus.map((s) => (
                    <span key={s.id} className="rounded bg-[var(--surface-2)] px-2 py-0.5">
                      {s.skuCode}: {formatINR(s.retailPricePaise)} ({s.stockQty} in stock)
                    </span>
                  ))}
                </div>
              </div>
              <Link
                to={`/admin/products/${p.id}`}
                className="pressable inline-flex min-h-[40px] items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-high)] px-4 text-sm font-semibold text-[var(--ink)] transition-colors"
              >
                Edit
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

async function resizeImageToWebpDataUrl(file: File, maxDim = 800): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL('image/webp', 0.85);
}

export function AdminProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const { catalog, refreshCatalog } = useStore();
  const pushToast = useUiStore((s) => s.pushToast);
  const navigate = useNavigate();

  const existing = !isNew ? catalog?.products.find((p) => p.id === id) : undefined;
  const existingSkus = !isNew ? catalog?.skus.filter((s) => s.productId === id) || [] : [];

  const [form, setForm] = useState<Partial<Product>>({
    name: existing?.name || '',
    slug: existing?.slug || '',
    categoryId: existing?.categoryId || catalog?.categories[0]?.id || 'cat-sev',
    description: existing?.description || '',
    ingredients: existing?.ingredients || '',
    allergens: existing?.allergens || 'Prepared in a facility handling peanuts.',
    hsnCode: existing?.hsnCode || '21069099',
    gstRate: existing?.gstRate ?? 12,
    shelfLifeDays: existing?.shelfLifeDays ?? 90,
    storage: existing?.storage || 'Store in a cool, dry place.',
    veg: existing?.veg ?? true,
    bestseller: existing?.bestseller ?? false,
    imageUrl: existing?.imageUrl || '',
    altText: existing?.altText || '',
    seoTitle: existing?.seoTitle || '',
    seoDescription: existing?.seoDescription || '',
    status: existing?.status || 'active',
  });

  const [newSku, setNewSku] = useState({
    skuCode: '',
    packLabel: '250 g',
    netWeightG: 250,
    shipWeightG: 280,
    mrpRupees: 150,
    retailRupees: 130,
    wholesaleRupees: 95,
    stockQty: 20,
  });

  useEffect(() => {
    if (existing) setForm(existing);
  }, [existing?.id]);

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      pushToast({ message: 'Image must be smaller than 5 MB.', tone: 'danger' });
      return;
    }
    const dataUrl = await resizeImageToWebpDataUrl(file, 800);
    setForm((f) => ({ ...f, imageUrl: dataUrl }));
    pushToast({ message: 'Resized product photo to 800px WebP', tone: 'success' });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const saved = await api.adminUpsertProduct({ ...form, id: isNew ? undefined : id });
      await refreshCatalog();
      pushToast({ message: 'Product saved', tone: 'success' });
      if (isNew) navigate(`/admin/products/${saved.id}`, { replace: true });
    } catch (err) {
      pushToast({ message: err instanceof Error ? err.message : 'Save failed', tone: 'danger' });
    }
  };

  const handleAddSku = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || isNew) return;
    try {
      await api.adminUpsertSku({
        productId: id,
        skuCode: newSku.skuCode.toUpperCase(),
        packLabel: newSku.packLabel,
        netWeightG: newSku.netWeightG,
        shipWeightG: newSku.shipWeightG,
        mrpPaise: Math.round(newSku.mrpRupees * 100),
        retailPricePaise: Math.round(newSku.retailRupees * 100),
        wholesalePricePaise: Math.round(newSku.wholesaleRupees * 100),
        stockQty: newSku.stockQty,
        status: 'active',
      });
      await refreshCatalog();
      pushToast({ message: 'SKU added', tone: 'success' });
    } catch (err) {
      pushToast({ message: err instanceof Error ? err.message : 'Unable to save SKU', tone: 'danger' });
    }
  };

  const seoTitlePreview = form.seoTitle || form.name || 'Product Name';
  const seoDescPreview = form.seoDescription || form.description || 'Product description';

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-[var(--ink)]">{isNew ? 'New Product' : `Edit ${form.name}`}</h1>
        <Link to="/admin/products" className="text-sm font-semibold text-[var(--primary)] hover:underline">
          Back to list
        </Link>
      </div>

      <form onSubmit={handleSaveProduct} className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Product Name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Slug" value={form.slug || ''} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} required />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Category"
            value={form.categoryId || ''}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            options={(catalog?.categories || []).map((c) => ({ value: c.id, label: c.name }))}
          />
          <Input label="HSN Code" value={form.hsnCode || ''} onChange={(e) => setForm({ ...form, hsnCode: e.target.value })} required />
          <Select
            label="GST Slab"
            value={String(form.gstRate ?? 12)}
            onChange={(e) => setForm({ ...form, gstRate: Number(e.target.value) })}
            options={['0', '5', '12', '18'].map((g) => ({ value: g, label: `${g}% GST` }))}
          />
        </div>

        <Textarea label="Description" rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        <Input label="Ingredients" value={form.ingredients || ''} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} required />

        <div className="flex flex-wrap items-center gap-4">
          <label className="pressable inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-high)] px-4 text-sm font-semibold cursor-pointer transition-colors">
            <Upload className="h-4 w-4" aria-hidden="true" />
            <span>Upload Photo (resizes to 800px WebP)</span>
            <input type="file" accept="image/*" onChange={handleImagePick} className="sr-only" />
          </label>
          <span className="text-xs text-[var(--ink-muted)] truncate max-w-xs">{form.imageUrl || 'No image'}</span>
        </div>

        {/* SEO Title/Desc counters + snippet preview */}
        <div className="rounded-xl bg-[var(--surface-2)] p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">SEO &amp; Search Snippet</p>
          <Input
            label={`SEO Title (${seoTitlePreview.length}/60 chars)`}
            value={form.seoTitle || ''}
            onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
          />
          <Textarea
            label={`SEO Description (${seoDescPreview.length}/160 chars)`}
            rows={2}
            value={form.seoDescription || ''}
            onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
          />
          <div className="rounded-lg bg-white p-3 border border-[var(--border-soft)] text-xs space-y-0.5">
            <p className="text-[#1a0dab] font-semibold text-sm">{seoTitlePreview}</p>
            <p className="text-[#4d5156]">{seoDescPreview.slice(0, 160)}</p>
          </div>
        </div>

        <Button type="submit" variant="primary">
          <Save className="h-4 w-4" aria-hidden="true" />
          <span>Save Product</span>
        </Button>
      </form>

      {!isNew && (
        <section className="rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-5 shadow-[var(--sh-1)] space-y-4">
          <h2 className="font-display text-lg font-bold text-[var(--ink)]">Pack Sizes &amp; Stock (SKUs)</h2>

          <div className="space-y-2">
            {existingSkus.map((s: Sku) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--surface-2)] px-4 py-2.5 text-sm tabular-nums">
                <div>
                  <span className="font-mono font-bold">{s.skuCode}</span> · {s.packLabel} ({s.netWeightG}g)
                </div>
                <div className="flex items-center gap-3">
                  <span>{formatINR(s.retailPricePaise)}</span>
                  <span className="font-semibold">{s.stockQty} qty</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      await api.adminUpsertSku({ ...s, stockQty: s.stockQty + 10 });
                      await refreshCatalog();
                      pushToast({ message: `Added +10 stock to ${s.skuCode}`, tone: 'success' });
                    }}
                  >
                    +10 Stock
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddSku} className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[var(--border-soft)]">
            <Input label="SKU Code" value={newSku.skuCode} onChange={(e) => setNewSku({ ...newSku, skuCode: e.target.value.toUpperCase() })} placeholder="ABH-250" required />
            <Input label="Pack Label" value={newSku.packLabel} onChange={(e) => setNewSku({ ...newSku, packLabel: e.target.value })} required />
            <Input label="Net Weight (g)" type="number" value={newSku.netWeightG} onChange={(e) => setNewSku({ ...newSku, netWeightG: Number(e.target.value) })} required />
            <Input label="Retail ₹" type="number" value={newSku.retailRupees} onChange={(e) => setNewSku({ ...newSku, retailRupees: Number(e.target.value) })} required />
            <div className="col-span-2 sm:col-span-4">
              <Button type="submit" variant="secondary" size="sm">
                Add SKU Pack
              </Button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
