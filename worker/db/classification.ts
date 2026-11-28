import { getTableColumns } from 'drizzle-orm';
import { categories, priceTiers, products, skus } from './schema';

// Every column of the catalog tables must be classified. A new column fails the schema test until classified here,
// so a wholesale or admin-only field can never leak into a public query by accident.
export type Visibility = 'public' | 'buyer-approved' | 'admin-only';

export const CLASSIFICATION = {
  categories: { id: 'public', slug: 'public', name: 'public', description: 'public', sortOrder: 'public', active: 'public' },
  products: {
    id: 'public', categoryId: 'public', slug: 'public', name: 'public', description: 'public', ingredients: 'public', allergens: 'public', veg: 'public',
    hsnCode: 'public', gstRate: 'public', shelfLifeDays: 'public', storage: 'public', bestseller: 'public', imageUrl: 'public', altText: 'public',
    seoTitle: 'public', seoDescription: 'public', faqJson: 'public', synonymsJson: 'public', searchKeywordsJson: 'public', status: 'admin-only', updatedAt: 'public',
  },
  skus: {
    id: 'public', productId: 'public', skuCode: 'public', packLabel: 'public', netWeightG: 'public', shipWeightG: 'public', mrpPaise: 'public',
    retailPricePaise: 'public', wholesalePricePaise: 'buyer-approved', wholesaleMoq: 'buyer-approved', stockQty: 'public', lowStockAt: 'admin-only', status: 'admin-only',
  },
  priceTiers: { id: 'buyer-approved', skuId: 'buyer-approved', minQty: 'buyer-approved', pricePaise: 'buyer-approved' },
} as const satisfies Record<string, Record<string, Visibility>>;

const TABLES = { categories, products, skus, priceTiers } as const;

/** Column objects safe for an anonymous visitor, to be passed to `db.select({...})`. */
export function publicColumns<K extends keyof typeof TABLES>(name: K) {
  const cols = getTableColumns(TABLES[name]) as Record<string, unknown>;
  const cls = CLASSIFICATION[name] as Record<string, Visibility>;
  return Object.fromEntries(Object.entries(cols).filter(([k]) => cls[k] === 'public')) as Partial<ReturnType<typeof getTableColumns<(typeof TABLES)[K]>>>;
}

export { TABLES as CATALOG_TABLES };
