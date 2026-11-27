import { describe, expect, it } from 'vitest';
import { clientConfig } from '../config/client.config';
import { SEED_CATEGORIES, SEED_PRODUCTS, SEED_SKUS } from '../api/mock/seed';
import { renderSeo } from './render';
import { generateSitemapXml } from './sitemap';
import { generateRobotsTxt } from './robots';
import { generateLlmsTxt } from './llms';

describe('SEO & Wholesale Isolation', () => {
  it('marks filtered /shop pages as noindex, follow', () => {
    const out = renderSeo({ route: 'shop', path: '/shop', hasFilterQuery: true, config: clientConfig, products: SEED_PRODUCTS });
    expect(out.head.robots).toBe('noindex, follow');
  });

  it('renders Product JSON-LD with retail prices only and zero wholesale data leak', () => {
    const prod = SEED_PRODUCTS[0];
    const skus = SEED_SKUS.filter((s) => s.productId === prod.id);
    const out = renderSeo({ route: 'product', path: `/p/${prod.slug}`, config: clientConfig, product: prod, skus });
    const serialized = JSON.stringify(out.jsonLd);
    expect(serialized).toContain('95.00');
    expect(serialized).not.toContain('68.00');
    expect(serialized).not.toContain('wholesale');
    expect(out.factsHtml).toContain('<dl>');
    expect(out.factsHtml).toContain('<table>');
  });

  it('excludes /admin, /cart, /checkout, /dev from sitemap & disallows them in robots.txt', () => {
    const sitemap = generateSitemapXml(clientConfig, SEED_CATEGORIES, SEED_PRODUCTS);
    expect(sitemap).toContain('/p/aloo-bhujia');
    expect(sitemap).not.toContain('/admin');
    expect(sitemap).not.toContain('/cart');

    const robots = generateRobotsTxt(clientConfig);
    expect(robots).toContain('Disallow: /admin');
    expect(robots).toContain('Disallow: /dev');

    const llms = generateLlmsTxt(clientConfig, SEED_CATEGORIES, SEED_PRODUCTS);
    expect(llms).toContain(clientConfig.brand.name);
    expect(llms).toContain(clientConfig.legal.fssai);
  });
});
