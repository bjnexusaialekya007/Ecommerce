import type { ClientConfig } from '../config/schema';
import { formatAddress } from '../shared/address';
import { formatINR, formatWeight } from '../shared/money';
import type { Category, Product, Sku } from '../shared/schemas';

export type SeoRouteKey =
  | 'home'
  | 'shop'
  | 'category'
  | 'product'
  | 'wholesale'
  | 'about'
  | 'contact'
  | 'faq'
  | 'privacy'
  | 'terms'
  | 'refund'
  | 'shipping'
  | 'noindex';

export interface SeoRenderInput {
  route: SeoRouteKey;
  path: string;
  hasFilterQuery?: boolean;
  config: ClientConfig;
  categories?: Category[];
  products?: Product[];
  skus?: Sku[];
  category?: Category | null;
  product?: Product | null;
}

export interface SeoRenderOutput {
  status: number;
  head: {
    title: string;
    description: string;
    canonical: string;
    robots: string;
    og: Array<{ property: string; content: string }>;
    twitter: Array<{ name: string; content: string }>;
    links: Array<{ rel: string; href: string }>;
  };
  jsonLd: Array<Record<string, unknown>>;
  factsHtml: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function paiseToDecimalString(paise: number): string {
  return (Math.round(paise) / 100).toFixed(2);
}

function absUrl(siteUrl: string, pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = siteUrl.replace(/\/+$/, '');
  const p = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${p}`;
}

export function renderSeo(input: SeoRenderInput): SeoRenderOutput {
  const { config, route, path, hasFilterQuery } = input;
  const cleanPath = path === '/' ? '/' : path.replace(/\/+$/, '').toLowerCase();
  const canonical = absUrl(config.seo.siteUrl, cleanPath);
  const fullAddr = formatAddress(config, 'oneLine');

  let status = 200;
  let title = config.seo.homeTitle;
  let description = config.seo.homeDescription;
  let robots = hasFilterQuery ? 'noindex, follow' : 'index, follow';
  let ogType = 'website';
  let ogImage = absUrl(config.seo.siteUrl, config.seo.defaultOgImage);
  const jsonLd: Array<Record<string, unknown>> = [];
  let factsHtml = '';

  const applyTemplate = (pageTitle: string) =>
    config.seo.titleTemplate.includes('%s')
      ? config.seo.titleTemplate.replace('%s', pageTitle)
      : `${pageTitle} | ${config.brand.name}`;

  if (route === 'noindex') {
    status = cleanPath === '/404' ? 404 : 200;
    title = applyTemplate('Store');
    description = config.seo.homeDescription;
    robots = 'noindex, nofollow';
  } else if (route === 'home') {
    title = config.seo.homeTitle;
    description = config.seo.homeDescription;
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: config.brand.name,
      url: config.seo.siteUrl,
    });
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'Store',
      name: config.brand.name,
      url: config.seo.siteUrl,
      image: ogImage,
      telephone: config.contact.phone,
      email: config.contact.email,
      priceRange: '₹85–₹495',
      address: {
        '@type': 'PostalAddress',
        streetAddress: [config.contact.addressParts.line1, config.contact.addressParts.line2, config.contact.addressParts.area]
          .filter(Boolean)
          .join(', '),
        addressLocality: config.contact.addressParts.city,
        addressRegion: config.contact.addressParts.state,
        postalCode: config.contact.addressParts.pincode,
        addressCountry: 'IN',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: config.contact.lat,
        longitude: config.contact.lng,
      },
      areaServed: 'IN',
      sameAs: config.seo.sameAs,
    });
    factsHtml = `<section data-seo-facts="home"><h1>${escapeHtml(config.brand.tagline)}</h1><p>${escapeHtml(config.brand.name)} — ${escapeHtml(fullAddr)}. FSSAI ${escapeHtml(config.legal.fssai)}. ${escapeHtml(config.copy.announcement)}</p></section>`;
  } else if (route === 'shop') {
    title = applyTemplate('All namkeen & snacks');
    description = `Browse all fresh small-batch snacks from ${config.brand.name}. Dispatch in ${config.dispatchDays} working days across India. FSSAI ${config.legal.fssai}.`;
    const activeProducts = (input.products || []).filter((p) => p.status === 'active');
    factsHtml = `<section data-seo-facts="shop"><h1>All products</h1><ul>${activeProducts
      .map((p) => `<li><a href="/p/${escapeHtml(p.slug)}">${escapeHtml(p.name)}</a></li>`)
      .join('')}</ul></section>`;
  } else if (route === 'category') {
    const cat = input.category;
    if (!cat) {
      status = 404;
      title = applyTemplate('Category not found');
      robots = 'noindex, nofollow';
    } else {
      title = applyTemplate(`${cat.name}: buy online`);
      description = cat.description.slice(0, 150);
      jsonLd.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: absUrl(config.seo.siteUrl, '/') },
          { '@type': 'ListItem', position: 2, name: cat.name, item: canonical },
        ],
      });
      const catProds = (input.products || []).filter((p) => p.categoryId === cat.id && p.status === 'active');
      factsHtml = `<section data-seo-facts="category"><h1>${escapeHtml(cat.name)}</h1><p>${escapeHtml(cat.description)}</p><ul>${catProds
        .map((p) => `<li><a href="/p/${escapeHtml(p.slug)}">${escapeHtml(p.name)}</a></li>`)
        .join('')}</ul></section>`;
    }
  } else if (route === 'product') {
    const prod = input.product;
    if (!prod) {
      status = 404;
      title = applyTemplate('Product not found');
      robots = 'noindex, nofollow';
    } else {
      const prodSkus = (input.skus || [])
        .filter((s) => s.productId === prod.id && s.status === 'active')
        .sort((a, b) => a.netWeightG - b.netWeightG);
      const lowestSku = prodSkus[0];
      const highestSku = prodSkus[prodSkus.length - 1];
      const packRange =
        lowestSku && highestSku && lowestSku.id !== highestSku.id
          ? `${lowestSku.packLabel} to ${highestSku.packLabel}`
          : lowestSku?.packLabel || '';

      title = applyTemplate(prod.seoTitle || `${prod.name}${packRange ? `, ${packRange}` : ''}`);
      const lowPriceStr = lowestSku ? formatINR(lowestSku.retailPricePaise) : '';
      description =
        prod.seoDescription ||
        `${prod.name}: ${prod.ingredients.slice(0, 65)}. ${prod.veg ? 'Vegetarian' : 'Non-vegetarian'}. Packs ${prodSkus.map((s) => s.packLabel).join(', ')} from ${lowPriceStr}. Ships across India. FSSAI ${config.legal.fssai}.`;
      ogType = 'product';
      if (prod.imageUrl) {
        ogImage = absUrl(config.seo.siteUrl, prod.imageUrl);
      }

      const breadcrumbs = [
        { '@type': 'ListItem', position: 1, name: 'Home', item: absUrl(config.seo.siteUrl, '/') },
      ];
      if (input.category) {
        breadcrumbs.push({
          '@type': 'ListItem',
          position: 2,
          name: input.category.name,
          item: absUrl(config.seo.siteUrl, `/c/${input.category.slug}`),
        });
      }
      breadcrumbs.push({
        '@type': 'ListItem',
        position: breadcrumbs.length + 1,
        name: prod.name,
        item: canonical,
      });
      jsonLd.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumbs });

      // Product + Offers (RETAIL PRICES ONLY — never wholesale)
      jsonLd.push({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: prod.name,
        description: prod.description,
        image: [ogImage],
        brand: { '@type': 'Brand', name: config.brand.name },
        offers: prodSkus.map((s) => ({
          '@type': 'Offer',
          sku: s.skuCode,
          name: `${prod.name} ${s.packLabel}`,
          price: paiseToDecimalString(s.retailPricePaise),
          priceCurrency: 'INR',
          availability: s.stockQty > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
          url: canonical,
          shippingDetails: {
            '@type': 'OfferShippingDetails',
            shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IN' },
            deliveryTime: {
              '@type': 'ShippingDeliveryTime',
              handlingTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: config.dispatchDays, unitCode: 'DAY' },
              transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 6, unitCode: 'DAY' },
            },
          },
          hasMerchantReturnPolicy: {
            '@type': 'MerchantReturnPolicy',
            applicableCountry: 'IN',
            returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
          },
        })),
      });

      const allFaqs = [
        ...prod.faq,
        {
          q: `Is ${prod.name} vegetarian?`,
          a: prod.veg ? `Yes, ${prod.name} is 100% vegetarian.` : 'Non-vegetarian.',
        },
        {
          q: 'How long does delivery take?',
          a: `We dispatch within ${config.dispatchDays} working days. Local delivery takes 1–2 days and pan-India courier takes 3–6 days.`,
        },
      ];
      if (allFaqs.length > 0) {
        jsonLd.push({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: allFaqs.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        });
      }

      const tableRows = prodSkus
        .map(
          (s) =>
            `<tr><td>${escapeHtml(s.packLabel)}</td><td>${escapeHtml(formatWeight(s.netWeightG))}</td><td>${escapeHtml(formatINR(s.mrpPaise))}</td><td>${escapeHtml(formatINR(s.retailPricePaise))}</td><td>${s.stockQty > 0 ? 'In stock' : 'Sold out'}</td></tr>`
        )
        .join('');
      factsHtml = `<article data-seo-facts="product"><h1>${escapeHtml(prod.name)}</h1><p>${escapeHtml(prod.description)}</p><dl><dt>Ingredients</dt><dd>${escapeHtml(prod.ingredients)}</dd><dt>Allergens</dt><dd>${escapeHtml(prod.allergens || 'None declared')}</dd><dt>Shelf life</dt><dd>${prod.shelfLifeDays} days from packing</dd><dt>FSSAI</dt><dd>${escapeHtml(config.legal.fssai)}</dd></dl><table><caption>Pack sizes and retail prices</caption><thead><tr><th>Pack</th><th>Net weight</th><th>MRP</th><th>Price</th><th>Availability</th></tr></thead><tbody>${tableRows}</tbody></table></article>`;
    }
  } else if (route === 'faq') {
    title = applyTemplate('Frequently asked questions');
    description = `Common questions about ${config.brand.name} freshness, shipping across India, FSSAI quality, and wholesale GST orders.`;
    if (config.seo.faq.length > 0) {
      jsonLd.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: config.seo.faq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      });
    }
    factsHtml = `<section data-seo-facts="faq"><h1>Frequently asked questions</h1>${config.seo.faq
      .map((f) => `<h2>${escapeHtml(f.q)}</h2><p>${escapeHtml(f.a)}</p>`)
      .join('')}</section>`;
  } else if (route === 'contact') {
    title = applyTemplate('Contact & store hours');
    description = `Contact ${config.brand.name} at ${config.contact.phone}, ${fullAddr}. Hours: ${config.hours.displayText}.`;
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: config.brand.name,
      telephone: config.contact.phone,
      email: config.contact.email,
      address: {
        '@type': 'PostalAddress',
        streetAddress: config.contact.addressParts.line1,
        addressLocality: config.contact.addressParts.city,
        addressRegion: config.contact.addressParts.state,
        postalCode: config.contact.addressParts.pincode,
        addressCountry: 'IN',
      },
      sameAs: config.seo.sameAs,
    });
    factsHtml = `<section data-seo-facts="contact"><h1>Contact ${escapeHtml(config.brand.name)}</h1><p>${escapeHtml(fullAddr)}</p><p>Phone: ${escapeHtml(config.contact.phone)}</p></section>`;
  } else if (route === 'wholesale') {
    title = applyTemplate('Wholesale & B2B enquiries');
    description = `Register your kirana or retail shop with GSTIN to unlock wholesale namkeen pricing from ${config.brand.name}.`;
    factsHtml = `<section data-seo-facts="wholesale"><h1>Wholesale &amp; B2B enquiries</h1><p>Register with your GSTIN for approved shop pricing. Call ${escapeHtml(config.contact.phone)}.</p></section>`;
  } else {
    const labelMap: Record<string, string> = {
      about: 'About us',
      privacy: 'Privacy policy',
      terms: 'Terms and conditions',
      refund: 'Refund and damage policy',
      shipping: 'Shipping and delivery policy',
    };
    const label = labelMap[route] || 'Information';
    title = applyTemplate(label);
    description = `${label} for ${config.brand.name}. ${fullAddr}. FSSAI ${config.legal.fssai}.`;
    factsHtml = `<section data-seo-facts="${route}"><h1>${escapeHtml(label)}</h1><p>${escapeHtml(config.brand.name)} — ${escapeHtml(fullAddr)}.</p></section>`;
  }

  return {
    status,
    head: {
      title,
      description: description.slice(0, 165),
      canonical,
      robots,
      og: [
        { property: 'og:title', content: title },
        { property: 'og:description', content: description.slice(0, 165) },
        { property: 'og:type', content: ogType },
        { property: 'og:url', content: canonical },
        { property: 'og:image', content: ogImage },
        { property: 'og:site_name', content: config.brand.name },
        { property: 'og:locale', content: 'en_IN' },
      ],
      twitter: [
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description.slice(0, 165) },
        { name: 'twitter:image', content: ogImage },
      ],
      links: [{ rel: 'canonical', href: canonical }],
    },
    jsonLd,
    factsHtml,
  };
}
