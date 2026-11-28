# Data Model (D1 / SQLite via Drizzle)

Source of truth: `worker/db/schema.ts`. Migrations: `/migrations` (generated with `npm run db:generate`). Local: `npm run db:migrate:local` then `npm run db:seed:local`.
Conventions: ids are text; money is integer paise with `CHECK >= 0`; timestamps are UTC ISO-8601 text; JSON lists (faq, synonyms, pincodes) are text columns; foreign keys use `ON DELETE RESTRICT` (zone pincodes cascade); order statuses, payment statuses, payment method and fulfilment mode have DB `CHECK` constraints that match `src/shared/status.ts` and `src/api/client.ts`.
D1 has no interactive transactions: every multi-row write is one `db.batch([...])` and must be safe to retry.

## Tables
| Table | Purpose | Key constraints and indexes |
|---|---|---|
| categories, products, slug_history, skus, price_tiers | Catalog. `slug_history` powers 301s. `price_tiers` are wholesale volume prices | unique `slug`, unique `sku_code`, unique (sku, min_qty); index (category, status), (product, status) |
| customers | Retail and wholesale buyers; wholesale status; `anonymised_at` for deletion requests | unique email; index phone, wholesale_status |
| coupons, zones, zone_pincodes, shipping_rates | Pricing rules. A pincode belongs to one local zone; courier fee comes from slabs by zone code and weight | pincode primary key; index (zone_code, min_weight) |
| orders, order_items, payments | Orders with immutable item snapshots (name, pack, HSN, GST, unit price, tax) and every payment attempt | unique public_code, idempotency_key, invoice_no (null until paid); index (status, created_at), payment_status, phone, razorpay_order_id |
| webhook_events | Provider event ids, inserted FIRST so a duplicate delivery is detected | `event_id` primary key |
| reservations | Stock held for an unpaid order | index `expires_at` (cron scan), order, sku |
| quote_requests, email_log, audit_log, price_log | Wholesale enquiries, every email attempt, every admin write, every retail price change | indexes by status/created/entity/sku |
| settings | Key/value (shop switch etc.) | |
| otp, sessions | Email OTP (stores an HMAC hash, never the code) and sessions (stores a hash of the random session id) | index (email, role, created_at), expires_at |
| invoice_counters | Next invoice number per financial year (April to March) | `fy` primary key |
| rate_limits | Sliding-window counters when the Workers rate-limit binding is not available | primary key (key, window_start) |

## Field classification (enforced by `worker/db/db.test.ts`)
Every column of `categories`, `products`, `skus` and `price_tiers` is classified in `worker/db/classification.ts`. A new column fails the test until it is classified. Public queries must select through `publicColumns()`.
- **public:** everything shown on the storefront (names, descriptions, retail price, MRP, stock quantity, pack, weight, HSN, GST rate).
- **buyer-approved:** `skus.wholesale_price_paise`, `skus.wholesale_moq` and all of `price_tiers`. Returned only to an approved wholesale buyer session.
- **admin-only:** `skus.low_stock_at`, `skus.status`, `products.status`, and every other table not listed above (orders, customers, payments, logs, sessions, settings).
Wholesale values must never appear in any public response, JSON-LD, sitemap, `llms.txt`, analytics event or log.

## Not in the schema yet
Stock decrement and reservation logic (W5), invoice numbering logic (W8), retention purge (W8). The tables exist; the behaviour is added in those phases.
