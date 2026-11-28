import { clientConfig } from '../../src/config/client.config';
import { SEED_CATEGORIES, SEED_COUPONS, SEED_PRODUCTS, SEED_SKUS, SEED_TIERS } from '../../src/api/mock/seed';

// Demo/dev seed as plain SQL (works with `wrangler d1 execute --file`). Idempotent: INSERT OR REPLACE.
const q = (v: unknown): string => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(Math.trunc(v));
  if (typeof v === 'boolean') return v ? '1' : '0';
  return `'${String(v).replace(/'/g, "''")}'`;
};
const row = (table: string, cols: Record<string, unknown>): string =>
  `INSERT OR REPLACE INTO ${table} (${Object.keys(cols).join(', ')}) VALUES (${Object.values(cols).map(q).join(', ')});`;

export function buildSeedStatements(): string[] {
  const out: string[] = [];
  const now = '2026-01-01T00:00:00.000Z';
  for (const c of SEED_CATEGORIES) out.push(row('categories', { id: c.id, slug: c.slug, name: c.name, description: c.description, sort_order: c.sortOrder, active: c.active }));
  for (const p of SEED_PRODUCTS) {
    out.push(row('products', {
      id: p.id, category_id: p.categoryId, slug: p.slug, name: p.name, description: p.description, ingredients: p.ingredients, allergens: p.allergens,
      veg: p.veg, hsn_code: p.hsnCode, gst_rate: p.gstRate, shelf_life_days: p.shelfLifeDays, storage: p.storage, bestseller: p.bestseller,
      image_url: p.imageUrl, alt_text: p.altText, seo_title: p.seoTitle ?? null, seo_description: p.seoDescription ?? null,
      faq_json: JSON.stringify(p.faq), synonyms_json: JSON.stringify(p.synonyms), search_keywords_json: JSON.stringify(p.searchKeywords),
      status: p.status, updated_at: p.updatedAt,
    }));
    for (const s of p.slugHistory) out.push(row('slug_history', { slug: s, product_id: p.id, created_at: now }));
  }
  for (const s of SEED_SKUS) {
    out.push(row('skus', {
      id: s.id, product_id: s.productId, sku_code: s.skuCode, pack_label: s.packLabel, net_weight_g: s.netWeightG, ship_weight_g: s.shipWeightG,
      mrp_paise: s.mrpPaise, retail_price_paise: s.retailPricePaise, wholesale_price_paise: s.wholesalePricePaise ?? null, wholesale_moq: s.wholesaleMoq,
      stock_qty: s.stockQty, low_stock_at: s.lowStockAt, status: s.status,
    }));
  }
  for (const t of SEED_TIERS) out.push(row('price_tiers', { id: t.id, sku_id: t.skuId, min_qty: t.minQty, price_paise: t.pricePaise }));
  for (const c of SEED_COUPONS) {
    out.push(row('coupons', {
      code: c.code, type: c.type, value: c.value, max_discount_paise: c.maxDiscountPaise, min_order_paise: c.minOrderPaise,
      valid_from: c.validFromIso, valid_to: c.validToIso, max_uses: c.maxUses, used_count: c.usedCount, active: c.active,
    }));
  }
  for (const z of clientConfig.zones) {
    out.push(row('zones', { id: z.id, name: z.name, pincodes_json: JSON.stringify(z.pincodes), fee_paise: z.feePaise, min_order_paise: z.minOrderPaise, free_above_paise: z.freeAbovePaise }));
    for (const pin of z.pincodes) out.push(row('zone_pincodes', { pincode: pin, zone_id: z.id }));
  }
  for (const r of clientConfig.shippingRates) {
    out.push(row('shipping_rates', { id: r.id, zone_code: r.zoneCode, zone_label: r.zoneLabel, min_weight_g: r.minWeightG, max_weight_g: r.maxWeightG, fee_paise: r.feePaise, free_above_paise: r.freeAbovePaise }));
  }
  out.push(row('settings', { key: 'shop_switch', value: 'auto', updated_at: now }));
  return out;
}
