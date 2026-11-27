# Client Rebrand & Swap Checklist

1. Duplicate or edit `src/config/client.config.ts` with real brand name, domain (`seo.siteUrl`), FSSAI (14 digits), GSTIN (15 chars + valid checksum), state code, pincodes/zones, and courier weight slabs.
2. Replace product photography in `src/assets/images/` (recommended 800×1000 / 800×600 WebP).
3. Update `src/api/mock/seed.ts` (or connect live `/api/*` backend) with active categories, products, SKUs, and coupons.
4. Configure real `analytics.ga4Id` and `security.turnstileSiteKey` in `client.config.ts`.
5. Run strict pre-launch gate:
   - `CLIENT_STRICT=1 npm run check:client`
   - `npm run check:boundaries`
   - `npm test`
   - `npm run build:seo && npm run check:budget`
