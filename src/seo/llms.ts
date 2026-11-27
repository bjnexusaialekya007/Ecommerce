import type { ClientConfig } from '../config/schema';
import type { Category, Product } from '../shared/schemas';

export function generateLlmsTxt(
  config: ClientConfig,
  categories: Category[],
  products: Product[]
): string {
  const base = config.seo.siteUrl.replace(/\/+$/, '');
  const lines = [
    `# ${config.brand.name}`,
    `> ${config.brand.tagline}. FSSAI ${config.legal.fssai}. Ships across India in ${config.dispatchDays} working days.`,
    '',
    '## Store Pages',
    `- [Home](${base}/): Store overview and featured snacks`,
    `- [All Products](${base}/shop): Full retail catalog`,
    `- [FAQ](${base}/faq): Freshness, shipping, and wholesale answers`,
    `- [Contact](${base}/contact): ${config.contact.phone} · ${config.contact.address}`,
    '',
    '## Categories',
    ...categories.filter((c) => c.active).map((c) => `- [${c.name}](${base}/c/${c.slug}): ${c.description}`),
    '',
    '## Products',
    ...products.filter((p) => p.status === 'active').map((p) => `- [${p.name}](${base}/p/${p.slug}): ${p.description}`),
  ];
  return lines.join('\n') + '\n';
}
