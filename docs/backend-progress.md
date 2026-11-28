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
