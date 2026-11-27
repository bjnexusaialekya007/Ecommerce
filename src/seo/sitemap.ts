import type { ClientConfig } from '../config/schema';
import type { Category, Product } from '../shared/schemas';

export function generateSitemapXml(
  config: ClientConfig,
  categories: Category[],
  products: Product[]
): string {
  const base = config.seo.siteUrl.replace(/\/+$/, '');
  const staticRoutes = [
    '/',
    '/shop',
    '/about',
    '/contact',
    '/policies/privacy',
    '/policies/terms',
    '/policies/refund',
    '/policies/shipping',
  ];
  if (config.features.wholesale) staticRoutes.push('/wholesale');
  if (config.features.faq) staticRoutes.push('/faq');

  const urls: Array<{ loc: string; lastmod?: string }> = staticRoutes.map((p) => ({
    loc: `${base}${p}`,
    lastmod: new Date().toISOString(),
  }));

  for (const c of categories) {
    if (c.active) {
      urls.push({ loc: `${base}/c/${c.slug}` });
    }
  }

  for (const p of products) {
    if (p.status === 'active') {
      urls.push({ loc: `${base}/p/${p.slug}`, lastmod: p.updatedAt });
    }
  }

  const body = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}\n  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}
