import { sql } from 'drizzle-orm';
import { check, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

// All money columns are integer paise with CHECK >= 0. All timestamps are UTC ISO-8601 text.
// Field classification (public / buyer-approved / admin-only) is in docs/data-model.md and enforced by tests.

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
});

export const products = sqliteTable(
  'products',
  {
    id: text('id').primaryKey(),
    categoryId: text('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    ingredients: text('ingredients').notNull().default(''),
    allergens: text('allergens').notNull().default(''),
    veg: integer('veg', { mode: 'boolean' }).notNull().default(true),
    hsnCode: text('hsn_code').notNull(),
    gstRate: integer('gst_rate').notNull(),
    shelfLifeDays: integer('shelf_life_days').notNull(),
    storage: text('storage').notNull().default(''),
    bestseller: integer('bestseller', { mode: 'boolean' }).notNull().default(false),
    imageUrl: text('image_url'),
    altText: text('alt_text').notNull().default(''),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    faqJson: text('faq_json').notNull().default('[]'),
    synonymsJson: text('synonyms_json').notNull().default('[]'),
    searchKeywordsJson: text('search_keywords_json').notNull().default('[]'),
    status: text('status', { enum: ['draft', 'active', 'archived'] }).notNull().default('draft'),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    index('products_category_status_idx').on(t.categoryId, t.status),
    check('products_gst_ck', sql`${t.gstRate} in (0, 5, 12, 18, 28)`),
    check('products_shelf_ck', sql`${t.shelfLifeDays} > 0`),
  ],
);

export const slugHistory = sqliteTable(
  'slug_history',
  {
    slug: text('slug').primaryKey(),
    productId: text('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('slug_history_product_idx').on(t.productId)],
);

export const skus = sqliteTable(
  'skus',
  {
    id: text('id').primaryKey(),
    productId: text('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
    skuCode: text('sku_code').notNull().unique(),
    packLabel: text('pack_label').notNull(),
    netWeightG: integer('net_weight_g').notNull(),
    shipWeightG: integer('ship_weight_g').notNull(),
    mrpPaise: integer('mrp_paise').notNull(),
    retailPricePaise: integer('retail_price_paise').notNull(),
    // buyer-approved: never returned to the public
    wholesalePricePaise: integer('wholesale_price_paise'),
    wholesaleMoq: integer('wholesale_moq').notNull().default(10),
    stockQty: integer('stock_qty').notNull().default(0),
    lowStockAt: integer('low_stock_at').notNull().default(10),
    status: text('status', { enum: ['draft', 'active', 'archived'] }).notNull().default('draft'),
  },
  (t) => [
    index('skus_product_status_idx').on(t.productId, t.status),
    check('skus_weight_ck', sql`${t.netWeightG} > 0 and ${t.shipWeightG} > 0`),
    check('skus_money_ck', sql`${t.mrpPaise} >= 0 and ${t.retailPricePaise} >= 0 and (${t.wholesalePricePaise} is null or ${t.wholesalePricePaise} >= 0)`),
    check('skus_stock_ck', sql`${t.stockQty} >= 0`),
    check('skus_moq_ck', sql`${t.wholesaleMoq} >= 1`),
  ],
);

// buyer-approved: wholesale tier prices
export const priceTiers = sqliteTable(
  'price_tiers',
  {
    id: text('id').primaryKey(),
    skuId: text('sku_id').notNull().references(() => skus.id, { onDelete: 'restrict' }),
    minQty: integer('min_qty').notNull(),
    pricePaise: integer('price_paise').notNull(),
  },
  (t) => [
    uniqueIndex('price_tiers_sku_qty_uq').on(t.skuId, t.minQty),
    check('price_tiers_ck', sql`${t.minQty} >= 1 and ${t.pricePaise} >= 0`),
  ],
);

export const customers = sqliteTable(
  'customers',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    email: text('email').notNull(),
    buyerType: text('buyer_type', { enum: ['retail', 'wholesale'] }).notNull().default('retail'),
    businessName: text('business_name'),
    gstin: text('gstin'),
    stateCode: text('state_code').notNull(),
    address: text('address'),
    wholesaleStatus: text('wholesale_status', { enum: ['pending', 'approved', 'rejected'] }),
    rejectReason: text('reject_reason'),
    approvedAt: text('approved_at'),
    anonymisedAt: text('anonymised_at'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [uniqueIndex('customers_email_uq').on(t.email), index('customers_phone_idx').on(t.phone), index('customers_wholesale_idx').on(t.wholesaleStatus)],
);

export const coupons = sqliteTable(
  'coupons',
  {
    code: text('code').primaryKey(),
    type: text('type', { enum: ['percent', 'fixed'] }).notNull(),
    value: integer('value').notNull(),
    maxDiscountPaise: integer('max_discount_paise'),
    minOrderPaise: integer('min_order_paise').notNull().default(0),
    validFrom: text('valid_from').notNull(),
    validTo: text('valid_to').notNull(),
    maxUses: integer('max_uses'),
    usedCount: integer('used_count').notNull().default(0),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
  },
  (t) => [check('coupons_ck', sql`${t.value} > 0 and ${t.minOrderPaise} >= 0 and ${t.usedCount} >= 0 and (${t.maxDiscountPaise} is null or ${t.maxDiscountPaise} >= 0)`)],
);

export const zones = sqliteTable(
  'zones',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    pincodesJson: text('pincodes_json').notNull().default('[]'),
    feePaise: integer('fee_paise').notNull(),
    minOrderPaise: integer('min_order_paise').notNull().default(0),
    freeAbovePaise: integer('free_above_paise'),
  },
  (t) => [check('zones_ck', sql`${t.feePaise} >= 0 and ${t.minOrderPaise} >= 0`)],
);

export const zonePincodes = sqliteTable(
  'zone_pincodes',
  {
    pincode: text('pincode').notNull(),
    zoneId: text('zone_id').notNull().references(() => zones.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.pincode] }), index('zone_pincodes_zone_idx').on(t.zoneId)],
);

export const shippingRates = sqliteTable(
  'shipping_rates',
  {
    id: text('id').primaryKey(),
    zoneCode: text('zone_code').notNull(),
    zoneLabel: text('zone_label').notNull(),
    minWeightG: integer('min_weight_g').notNull(),
    maxWeightG: integer('max_weight_g').notNull(),
    feePaise: integer('fee_paise').notNull(),
    freeAbovePaise: integer('free_above_paise'),
  },
  (t) => [index('shipping_rates_zone_idx').on(t.zoneCode, t.minWeightG), check('shipping_rates_ck', sql`${t.minWeightG} >= 1 and ${t.maxWeightG} >= ${t.minWeightG} and ${t.feePaise} >= 0`)],
);

export const orders = sqliteTable(
  'orders',
  {
    id: text('id').primaryKey(),
    publicCode: text('public_code').notNull().unique(),
    invoiceNo: text('invoice_no').unique(),
    invoiceToken: text('invoice_token').notNull(),
    idempotencyKey: text('idempotency_key').notNull().unique(),
    status: text('status', { enum: ['pending_payment', 'paid', 'packed', 'shipped', 'delivered', 'cancelled', 'expired', 'refunded'] }).notNull(),
    paymentStatus: text('payment_status', { enum: ['pending', 'captured', 'failed', 'cod_pending', 'refunded', 'amount_mismatch'] }).notNull(),
    paymentMethod: text('payment_method', { enum: ['razorpay', 'cod'] }).notNull(),
    mode: text('mode', { enum: ['local', 'courier', 'pickup'] }).notNull(),
    buyerType: text('buyer_type', { enum: ['retail', 'wholesale'] }).notNull(),
    customerId: text('customer_id').references(() => customers.id, { onDelete: 'restrict' }),
    customerName: text('customer_name').notNull(),
    phone: text('phone').notNull(),
    email: text('email').notNull().default(''),
    addressSummary: text('address_summary').notNull().default(''),
    pincode: text('pincode').notNull().default(''),
    stateCode: text('state_code').notNull(),
    gstin: text('gstin').notNull().default(''),
    businessName: text('business_name').notNull().default(''),
    placeOfSupplyState: text('place_of_supply_state').notNull(),
    isInterState: integer('is_inter_state', { mode: 'boolean' }).notNull(),
    pricesInclusive: integer('prices_inclusive', { mode: 'boolean' }).notNull(),
    subtotal: integer('subtotal').notNull(),
    discount: integer('discount').notNull().default(0),
    shipping: integer('shipping').notNull().default(0),
    cgst: integer('cgst').notNull().default(0),
    sgst: integer('sgst').notNull().default(0),
    igst: integer('igst').notNull().default(0),
    tax: integer('tax').notNull().default(0),
    total: integer('total').notNull(),
    shipWeightG: integer('ship_weight_g').notNull().default(0),
    couponCode: text('coupon_code'),
    razorpayOrderId: text('razorpay_order_id'),
    razorpayPaymentId: text('razorpay_payment_id'),
    courierName: text('courier_name'),
    trackingId: text('tracking_id'),
    trackingUrl: text('tracking_url'),
    dispatchBy: text('dispatch_by').notNull().default(''),
    payBy: text('pay_by').notNull().default(''),
    notes: text('notes').notNull().default(''),
    attributionJson: text('attribution_json'),
    amountMismatchFlag: integer('amount_mismatch_flag', { mode: 'boolean' }).notNull().default(false),
    emailFailedFlag: integer('email_failed_flag', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    index('orders_status_created_idx').on(t.status, t.createdAt),
    index('orders_payment_status_idx').on(t.paymentStatus),
    index('orders_phone_idx').on(t.phone),
    index('orders_customer_idx').on(t.customerId),
    index('orders_razorpay_order_idx').on(t.razorpayOrderId),
    check('orders_status_ck', sql`${t.status} in ('pending_payment','paid','packed','shipped','delivered','cancelled','expired','refunded')`),
    check('orders_payment_status_ck', sql`${t.paymentStatus} in ('pending','captured','failed','cod_pending','refunded','amount_mismatch')`),
    check('orders_payment_method_ck', sql`${t.paymentMethod} in ('razorpay','cod')`),
    check('orders_mode_ck', sql`${t.mode} in ('local','courier','pickup')`),
    check('orders_money_ck', sql`${t.subtotal} >= 0 and ${t.discount} >= 0 and ${t.shipping} >= 0 and ${t.cgst} >= 0 and ${t.sgst} >= 0 and ${t.igst} >= 0 and ${t.tax} >= 0 and ${t.total} >= 0`),
  ],
);

export const orderItems = sqliteTable(
  'order_items',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'restrict' }),
    skuId: text('sku_id').notNull().references(() => skus.id, { onDelete: 'restrict' }),
    // snapshots: later catalog edits must never change a placed order or an invoice
    skuCode: text('sku_code').notNull(),
    name: text('name').notNull(),
    packLabel: text('pack_label').notNull(),
    hsnCode: text('hsn_code').notNull(),
    gstRate: integer('gst_rate').notNull(),
    qty: integer('qty').notNull(),
    unitPaise: integer('unit_paise').notNull(),
    taxableValue: integer('taxable_value').notNull(),
    cgst: integer('cgst').notNull().default(0),
    sgst: integer('sgst').notNull().default(0),
    igst: integer('igst').notNull().default(0),
    lineTotal: integer('line_total').notNull(),
  },
  (t) => [index('order_items_order_idx').on(t.orderId), index('order_items_sku_idx').on(t.skuId), check('order_items_ck', sql`${t.qty} >= 1 and ${t.unitPaise} >= 0 and ${t.taxableValue} >= 0 and ${t.lineTotal} >= 0`)],
);

export const payments = sqliteTable(
  'payments',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'restrict' }),
    provider: text('provider').notNull().default('razorpay'),
    status: text('status').notNull(),
    amountPaise: integer('amount_paise'),
    providerOrderId: text('provider_order_id'),
    providerPaymentId: text('provider_payment_id'),
    note: text('note').notNull().default(''),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('payments_order_idx').on(t.orderId), index('payments_provider_payment_idx').on(t.providerPaymentId), check('payments_ck', sql`${t.amountPaise} is null or ${t.amountPaise} >= 0`)],
);

export const webhookEvents = sqliteTable('webhook_events', {
  eventId: text('event_id').primaryKey(), // inserted FIRST; a conflict means already processed
  provider: text('provider').notNull().default('razorpay'),
  eventType: text('event_type').notNull(),
  receivedAt: text('received_at').notNull(),
  processedAt: text('processed_at'),
});

export const reservations = sqliteTable(
  'reservations',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'restrict' }),
    skuId: text('sku_id').notNull().references(() => skus.id, { onDelete: 'restrict' }),
    qty: integer('qty').notNull(),
    expiresAt: text('expires_at').notNull(),
    releasedAt: text('released_at'),
  },
  (t) => [index('reservations_expires_idx').on(t.expiresAt), index('reservations_order_idx').on(t.orderId), index('reservations_sku_idx').on(t.skuId), check('reservations_ck', sql`${t.qty} >= 1`)],
);

export const quoteRequests = sqliteTable(
  'quote_requests',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    email: text('email').notNull(),
    gstin: text('gstin').notNull().default(''),
    itemsJson: text('items_json').notNull().default('[]'),
    message: text('message').notNull().default(''),
    status: text('status', { enum: ['new', 'replied', 'closed'] }).notNull().default('new'),
    replyNote: text('reply_note').notNull().default(''),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('quote_requests_status_idx').on(t.status, t.createdAt)],
);

export const emailLog = sqliteTable(
  'email_log',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id').references(() => orders.id, { onDelete: 'restrict' }),
    event: text('event').notNull(),
    toEmail: text('to_email').notNull(),
    subject: text('subject').notNull(),
    status: text('status', { enum: ['queued', 'sent', 'failed'] }).notNull(),
    attempt: integer('attempt').notNull().default(1),
    error: text('error'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('email_log_order_idx').on(t.orderId), index('email_log_status_idx').on(t.status, t.createdAt)],
);

export const auditLog = sqliteTable(
  'audit_log',
  {
    id: text('id').primaryKey(),
    actor: text('actor').notNull(),
    action: text('action').notNull(),
    entity: text('entity').notNull(),
    summary: text('summary').notNull(),
    requestId: text('request_id'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('audit_log_created_idx').on(t.createdAt), index('audit_log_entity_idx').on(t.entity)],
);

export const priceLog = sqliteTable(
  'price_log',
  {
    id: text('id').primaryKey(),
    skuId: text('sku_id').notNull().references(() => skus.id, { onDelete: 'restrict' }),
    skuCode: text('sku_code').notNull(),
    oldRetailPaise: integer('old_retail_paise').notNull(),
    newRetailPaise: integer('new_retail_paise').notNull(),
    changedBy: text('changed_by').notNull(),
    changedAt: text('changed_at').notNull(),
  },
  (t) => [index('price_log_sku_idx').on(t.skuId, t.changedAt)],
);

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const otp = sqliteTable(
  'otp',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    role: text('role', { enum: ['owner', 'buyer'] }).notNull(),
    codeHash: text('code_hash').notNull(), // HMAC-SHA256 with the server pepper, never the code
    expiresAt: text('expires_at').notNull(),
    attempts: integer('attempts').notNull().default(0),
    consumedAt: text('consumed_at'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('otp_email_role_idx').on(t.email, t.role, t.createdAt)],
);

export const sessions = sqliteTable(
  'sessions',
  {
    idHash: text('id_hash').primaryKey(), // hash of the random 256-bit session id
    role: text('role', { enum: ['owner', 'buyer'] }).notNull(),
    email: text('email').notNull(),
    customerId: text('customer_id').references(() => customers.id, { onDelete: 'restrict' }),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at').notNull(),
    revokedAt: text('revoked_at'),
  },
  (t) => [index('sessions_expires_idx').on(t.expiresAt), index('sessions_email_idx').on(t.email)],
);

export const invoiceCounters = sqliteTable('invoice_counters', {
  fy: text('fy').primaryKey(), // e.g. '26-27' (April to March)
  lastNo: integer('last_no').notNull().default(0),
});

export const rateLimits = sqliteTable(
  'rate_limits',
  {
    key: text('key').notNull(),
    windowStart: integer('window_start').notNull(),
    count: integer('count').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);
