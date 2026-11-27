# ApiClient Interface Contract (`src/api/client.ts`)

- **Public Storefront**: `getCatalog`, `getProductBySlug`, `getConfigPublic`, `getShopStatus`, `quoteCart`, `createOrder(input, idempotencyKey)`, `getOrder(code, last4)`, `getOrderByInvoiceToken(code, token)`.
- **Payments**: `createRazorpayOrder(publicCode)`, `verifyRazorpayPayment`.
- **Auth & Wholesale**: `requestOtp`, `verifyOtp`, `logout`, `registerWholesale`, `getWholesaleMe`, `submitQuoteRequest`.
- **Admin Operations**: `adminGetOrders`, `adminGetOrder`, `adminTransitionOrder`, `adminMarkShipped`, `adminResolveMismatch`, `adminRetryEmail`, `adminUpsertProduct`, `adminUpsertSku`, `adminCsvDryRun`, `adminCsvCommit`, `adminGetBuyers`, `adminApproveBuyer`, `adminRejectBuyer`, `adminGetQuotes`, `adminUpdateQuote`, `adminUpdateShippingRates`, `adminUpdateZones`, `adminUpsertCoupon`, `adminUpdateSettings`, `adminSetShopSwitch`, `adminGetReports`, `adminGetAudit`, `adminExportAll`.
