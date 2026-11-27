import fs from 'fs';
import path from 'path';
import { clientConfig } from '../src/config/client.config';
import { SEED_CATEGORIES, SEED_PRODUCTS, SEED_SKUS } from '../src/api/mock/seed';
import { renderSeo, type SeoRouteKey } from '../src/seo/render';
import { generateSitemapXml } from '../src/seo/sitemap';
import { generateRobotsTxt } from '../src/seo/robots';
import { generateLlmsTxt } from '../src/seo/llms';

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const TEMPLATE_PATH = path.join(DIST_DIR, 'index.html');

if (!fs.existsSync(TEMPLATE_PATH)) {
  console.error('❌ dist/index.html missing. Run vite build before prerender.');
  process.exit(1);
}

const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function writeRouteHtml(routePath: string, route: SeoRouteKey, extra: Record<string, unknown> = {}) {
  const out = renderSeo({ route, path: routePath, config: clientConfig, ...extra });

  const headTags = [
    `<title>${escapeAttr(out.head.title)}</title>`,
    `<meta name="description" content="${escapeAttr(out.head.description)}" />`,
    `<meta name="robots" content="${escapeAttr(out.head.robots)}" />`,
    ...out.head.links.map((l) => `<link rel="${escapeAttr(l.rel)}" href="${escapeAttr(l.href)}" />`),
    ...out.head.og.map((m) => `<meta property="${escapeAttr(m.property)}" content="${escapeAttr(m.content)}" />`),
    ...out.head.twitter.map((m) => `<meta name="${escapeAttr(m.name)}" content="${escapeAttr(m.content)}" />`),
    ...out.jsonLd.map((ld) => `<script type="application/ld+json">${JSON.stringify(ld)}</script>`),
  ].join('\n    ');

  let html = template;
  if (html.includes('<!--seo-head-->')) {
    html = html
      .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
      .replace(/<meta\s+name="description"[^>]*>\s*/i, '')
      .replace(/<meta\s+property="og:title"[^>]*>\s*/i, '')
      .replace(/<meta\s+property="og:description"[^>]*>\s*/i, '')
      .replace(/<meta\s+property="og:type"[^>]*>\s*/i, '')
      .replace(/<meta\s+property="og:site_name"[^>]*>\s*/i, '')
      .replace(/<meta\s+name="twitter:card"[^>]*>\s*/i, '')
      .replace('<!--seo-head-->', headTags);
  } else {
    html = html.replace('</head>', `  ${headTags}\n  </head>`);
  }

  if (html.includes('<!--seo-facts-->')) {
    html = html.replace('<!--seo-facts-->', `<noscript>${out.factsHtml}</noscript>`);
  }

  const targetFile =
    routePath === '/'
      ? path.join(DIST_DIR, 'index.html')
      : routePath === '/404'
      ? path.join(DIST_DIR, '404.html')
      : path.join(DIST_DIR, routePath.slice(1), 'index.html');

  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  fs.writeFileSync(targetFile, html, 'utf-8');
}

const activeCats = SEED_CATEGORIES.filter((c) => c.active);
const activeProds = SEED_PRODUCTS.filter((p) => p.status === 'active');

writeRouteHtml('/', 'home', { products: activeProds });
writeRouteHtml('/shop', 'shop', { products: activeProds });
writeRouteHtml('/wholesale', 'wholesale');
writeRouteHtml('/about', 'about');
writeRouteHtml('/contact', 'contact');
writeRouteHtml('/faq', 'faq');
writeRouteHtml('/policies/privacy', 'privacy');
writeRouteHtml('/policies/terms', 'terms');
writeRouteHtml('/policies/refund', 'refund');
writeRouteHtml('/policies/shipping', 'shipping');
writeRouteHtml('/404', 'noindex');

for (const c of activeCats) {
  writeRouteHtml(`/c/${c.slug}`, 'category', { category: c, products: activeProds });
}

for (const p of activeProds) {
  const cat = activeCats.find((c) => c.id === p.categoryId) || null;
  const skus = SEED_SKUS.filter((s) => s.productId === p.id);
  writeRouteHtml(`/p/${p.slug}`, 'product', { category: cat, product: p, skus });
}

fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), generateSitemapXml(clientConfig, activeCats, activeProds), 'utf-8');
fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), generateRobotsTxt(clientConfig), 'utf-8');
fs.writeFileSync(path.join(DIST_DIR, 'llms.txt'), generateLlmsTxt(clientConfig, activeCats, activeProds), 'utf-8');

console.log(`✅ Prerendered ${10 + activeCats.length + activeProds.length} routes + sitemap.xml + robots.txt + llms.txt`);
