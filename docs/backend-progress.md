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
