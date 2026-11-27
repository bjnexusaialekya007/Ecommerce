import { useMemo } from 'react';
import { renderSeo, type SeoRenderInput } from './render';

/**
 * Uses React 19 native metadata hoisting (A2) for title, meta, canonical, and JSON-LD.
 */
export function Seo(props: SeoRenderInput) {
  const rendered = useMemo(() => renderSeo(props), [
    props.route,
    props.path,
    props.hasFilterQuery,
    props.config,
    props.category,
    props.product,
    props.products,
    props.skus,
  ]);

  return (
    <>
      <title>{rendered.head.title}</title>
      <meta name="description" content={rendered.head.description} />
      <meta name="robots" content={rendered.head.robots} />
      {rendered.head.links.map((l) => (
        <link key={l.rel} rel={l.rel} href={l.href} />
      ))}
      {rendered.head.og.map((m) => (
        <meta key={m.property} property={m.property} content={m.content} />
      ))}
      {rendered.head.twitter.map((m) => (
        <meta key={m.name} name={m.name} content={m.content} />
      ))}
      {props.config.seo.googleSiteVerification && (
        <meta name="google-site-verification" content={props.config.seo.googleSiteVerification} />
      )}
      {rendered.jsonLd.map((ld, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      ))}
    </>
  );
}
