# ApiClient Interface Contract (`src/api/client.ts`)

- **Public Storefront**: `getCatalog`, `getProductBySlug`, `getConfigPublic`, `getShopStatus`, `quoteCart`, `createOrder(input, idempotencyKey)`, `getOrder(code, last4)`, `getOrderByInvoiceToken(code, token)`.
- **Payments**: `createRazorpayOrder(publicCode)`, `verifyRazorpayPayment`.
- **Auth & Wholesale**: `requestOtp`, `verifyOtp`, `logout`, `registerWholesale`, `getWholesaleMe`, `submitQuoteRequest`.
- **Admin Operations**: `adminGetOrders`, `adminGetOrder`, `adminTransitionOrder`, `adminMarkShipped`, `adminResolveMismatch`, `adminRetryEmail`, `adminUpsertProduct`, `adminUpsertSku`, `adminCsvDryRun`, `adminCsvCommit`, `adminGetBuyers`, `adminApproveBuyer`, `adminRejectBuyer`, `adminGetQuotes`, `adminUpdateQuote`, `adminUpdateShippingRates`, `adminUpdateZones`, `adminUpsertCoupon`, `adminUpdateSettings`, `adminSetShopSwitch`, `adminGetReports`, `adminGetAudit`, `adminExportAll`.


## HTTP route table (W2 to W9)
All JSON, same origin, prefix `/api`. Errors: `{ "error": { "code", "message", "field?", "requestId" } }` with the `ErrorCode` set in `src/shared/errors.ts` (status per code in `worker/lib/errors.ts`). Roles: P public, B buyer session, O owner session. `Idempotency-Key` header on order creation.
| Method and path | Role | ApiClient method | Phase |
|---|---|---|---|
| GET /health | P | | W1 (done) |
| GET /config/public | P | getConfigPublic | W1 (done) |
| GET /shop-status | P | getShopStatus | W3 |
| GET /catalog | P | getCatalog | W3 |
| GET /products/:slug | P | getProductBySlug | W3 |
| POST /cart/quote | P | quoteCart | W3 |
| GET /serviceability?pincode= | P | (new) | W3 |
| POST /orders | P | createOrder | W5 |
| GET /orders/:code?last4= | P | getOrder | W5 |
| GET /orders/:code/invoice?t= | P | getOrderByInvoiceToken | W5/W8 |
| POST /payments/razorpay/order | P | createRazorpayOrder | W5 |
| POST /payments/razorpay/verify | P | verifyRazorpayPayment | W5 |
| POST /webhooks/razorpay | P (signed) | | W5 |
| POST /auth/otp, POST /auth/verify, POST /auth/logout | P / B / O | requestOtp, verifyOtp, logout | W4 |
| POST /wholesale/register, GET /wholesale/me, POST /wholesale/quotes | P / B | registerWholesale, getWholesaleMe, submitQuoteRequest | W4/W6 |
| /admin/orders (list, detail, transition, ship, resolve-mismatch, retry-email) | O | adminGetOrders, adminGetOrder, adminTransitionOrder, adminMarkShipped, adminResolveMismatch, adminRetryEmail | W6 |
| /admin/products, /admin/skus, /admin/csv/dry-run, /admin/csv/commit | O | adminUpsertProduct, adminUpsertSku, adminCsvDryRun, adminCsvCommit | W6 |
| /admin/buyers (+approve, reject), /admin/quotes | O | adminGetBuyers, adminApproveBuyer, adminRejectBuyer, adminGetQuotes, adminUpdateQuote | W6 |
| /admin/shipping-rates, /admin/zones, /admin/coupons/:code, /admin/settings, /admin/shop-switch | O | adminUpdateShippingRates, adminUpdateZones, adminUpsertCoupon, adminUpdateSettings, adminSetShopSwitch | W6 |
| /admin/reports, /admin/audit, /admin/export | O | adminGetReports, adminGetAudit, adminExportAll | W6 |
| GET /sitemap.xml, /robots.txt, /llms.txt, GET /invoice/:code?t= | P | | W7/W8 |
Method names above must match `src/api/client.ts`; when a method is missing or renamed there, change the table and the shared types first.
