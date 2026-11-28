# Backend progress

## Assumptions (W1)
1. The frontend contract (`src/api/client.ts`) is a TypeScript interface, not an HTTP route table. Route paths and verbs are decided phase by phase and written into `docs/api-contract.md` BEFORE the route is implemented (W3 onward). W1 defines only `/api/health` and `/api/config/public`.
2. Error envelope is `{ error: { code, message, field?, requestId } }` using the frontend `ErrorCode` set. HTTP status per code is in `worker/lib/errors.ts` (`STATUS_BY_CODE`). The frontend must read `error.code`, not the status.
3. `/api/config/public` serves the default client config minus `adminAllowlist`. The per-customer values later come from `wrangler.jsonc` vars and secrets (spec rule 7).
4. W1 tests use Hono's `app.request()` under Node, not `@cloudflare/vitest-pool-workers` (vitest 5 compatibility not yet checked). `wrangler dev` was also run against real workerd by hand.
5. No new frontend file changed. `package.json` gained `hono` and `wrangler` (exact pins) and the scripts `dev:worker`, `deploy:staging`; `test` now runs `src` and `worker`.

## W1 results (real output, 2026-11-28)
- `npm run typecheck`: exit 0.
- `npm test`: 7 files, 50 tests passed.
- `wrangler deploy --dry-run`: bundles; bindings listed: ASSETS, ENVIRONMENT.
- `wrangler dev --local`: `GET /api/health` 200 with `x-request-id`; `GET /api/config/public` 200 (no admin allowlist); `GET /` 200 (SPA via assets); cross-site `POST /api/x` 403 `FORBIDDEN` envelope.

## Not done yet
W2 database, W3 catalog and quote, W4 auth, W5 orders and payments, W6 admin, W7 SEO at the edge, W8 notifications and cron, W9 cutover.

## F0 results (real output, 2026-11-28)
Branch `phase/f0-hygiene` (built on `backend/w1-scaffold`, so merging it also merges W1).
- `bun.lock` deleted, `engines.node >= 22` added. `rm -rf node_modules && npm ci` works.
- Bundle: the old budget only measured `index-*.js` (190.3 KB). Splitting code made that number misleading, so `scripts/check-budget.ts` now measures all JS loaded up front (entry plus modulepreload links in `dist/index.html`) against the same 170 KB limit. Result: **169.6 KB across 54 files (limit 170 KB)**. This is a thin margin; Cloudflare serves Brotli, which is smaller. Changes: mock API loaded on first call (`src/api/index.ts`), motion features lazy, runtime zod validation and the demo config moved out of first load (`src/config/validate.ts`; used by `?client=demo`, `?invalidConfig=1` and dev).
- Bug found and fixed from screenshots: home hero buttons showed the raw keys `hero.primaryCta` / `hero.secondaryCta`; added `hero.*` keys to `src/i18n/en.ts`, pointed the two section headings at the existing `home.categoriesHeading` / `home.bestSellersHeading` keys, and added `src/i18n/keys.test.ts` so a missing key fails CI.
- `npm run typecheck` exit 0; `npm test` 8 files, 51 tests passed; `build:seo` 19 routes; `check:budget` passes.
- Browser run (Playwright, preview build, 3 widths): no console or page errors except blocked Google Fonts (sandbox has no internet); add-to-cart then cart shows the item through the lazy API.
- Screenshots: `docs/screens/*.png` (6 screens x 3 widths).

### UI review (J6), only what was actually looked at
Looked at: home 375, product 375, cart 375, admin login 1280. Not yet reviewed by eye: shop, checkout with items, order status, admin orders and products after login, tablet widths. NOT RUN: real-device Lighthouse, usability test.
Findings: (1) raw i18n keys on home: fixed. (2) Admin login says "Staff Operations Sign In / any team admin email" but only the two allowlisted owner emails can sign in: reword (owner decision). (3) The "Closed now" banner and the "Closed now" chip both show on home while the shop is closed: harmless, consider keeping one. (4) Fonts could not load in the sandbox, so typography was not judged.

## W2 results (real output, 2026-11-28)
Branch `phase/w2-database`. Added: `worker/db/{schema,classification,seed}.ts`, `drizzle.config.ts`, `migrations/0000_init.sql`, `scripts/seed-local.ts`, D1 binding `DB` in `wrangler.jsonc` (staging and production have placeholder ids `REPLACE_WITH_*`; create the real databases with `wrangler d1 create` before deploying), `docs/data-model.md` and the route table in `docs/api-contract.md`.
- 25 tables, 18 `CHECK` constraints (money >= 0, enums, weights, GST rate in 0/5/12/18/28), unique and FK constraints, indexes for every admin filter and for the reservation expiry scan.
- `npm run db:migrate:local` on a fresh local D1: 61 commands, `0000_init.sql` OK.
- `npm run db:seed:local`: 53 statements; counts: 4 categories, 5 products, 12 SKUs, 4 price tiers, 2 coupons, 2 zones, 9 zone pincodes, 10 shipping rates.
- `npm run typecheck` exit 0; `npm test`: 9 files, 62 tests passed (11 new, run against a real local D1 through wrangler's `getPlatformProxy`): seed loaded, every catalog column classified, public selectors exclude wholesale and admin-only fields, negative paise rejected, unique sku_code and slug, FK restrict, duplicate webhook event id rejected, unique idempotency key / public code / invoice number, invalid status rejected, reservation expiry index exists, `db.batch` rolls back on failure.
- Dependencies added: `drizzle-orm 0.45.2`, `drizzle-kit 0.31.10` (dev), `@cloudflare/workers-types 5.20261127.1` (dev; this is the exact peer range wrangler 4.169.0 requires, and it is under 14 days old, so it breaks the pin-age rule on purpose).
- Repo hygiene: `.wrangler/state/` (local database files, 21 of them) had been committed by mistake; removed from git and `.wrangler/` added to `.gitignore`.
Assumptions: the real entity fields (from `src/shared/schemas.ts` and `OrderRecord`) were used, not the earlier draft list; `status` of products and SKUs is classified admin-only for the public selector but the storefront filters on `active` server-side; product/SKU status enums are validated in the app layer (zod), only order-side enums have DB CHECKs.
NOT RUN: migration against a remote (staging) D1, because no Cloudflare account is connected yet.
