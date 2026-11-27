import { resolveClientConfig, type ClientConfig } from '../../config';
import { getSimulatedNow, useDevSimStore } from '../../dev/simStore';
import { useOutboxStore } from '../../dev/outboxStore';
import { getFinancialYearCode, getIstDateString, getShopStatus } from '../../shared/calendar';
import { AppError } from '../../shared/errors';
import { renderNotificationTemplate } from '../../shared/notify';
import { createConfigCourierProvider, createMockPaymentProvider, type NotificationEvent, type NotificationMessage } from '../../shared/providers';
import { computeQuote } from '../../shared/quote';
import {
  CsvImportRowSchema,
  type Category,
  type Coupon,
  type CreateOrderInput,
  type Customer,
  type PriceTier,
  type Product,
  type Sku,
} from '../../shared/schemas';
import { assertOrderTransition, type OrderStatus } from '../../shared/status';
import { useAuthStore } from '../../stores/auth';
import type {
  ApiClient,
  AuditLogEntry,
  CatalogResponse,
  OrderRecord,
  PriceLogEntry,
  WholesaleQuoteRequest,
} from '../client';
import { SEED_CATEGORIES, SEED_COUPONS, SEED_CUSTOMERS, SEED_PRODUCTS, SEED_SKUS, SEED_TIERS } from './seed';

interface MockDb {
  config: ClientConfig;
  categories: Category[];
  products: Product[];
  skus: Sku[];
  tiers: PriceTier[];
  coupons: Coupon[];
  customers: Customer[];
  orders: OrderRecord[];
  quotes: WholesaleQuoteRequest[];
  audit: AuditLogEntry[];
  priceLog: PriceLogEntry[];
  reservations: Array<{ orderId: string; skuId: string; qty: number; expiresAt: string; released: boolean }>;
  webhookSeen: Set<string>;
}

function createInitialDb(): MockDb {
  const resolved = resolveClientConfig(typeof window !== 'undefined' ? window.location.search : '');
  const baseCfg = resolved.ok ? structuredClone(resolved.config) : null;
  if (!baseCfg) {
    throw new AppError('SERVER', 'Invalid config', undefined, 500);
  }

  // Seed one historical order so /track works immediately
  const sampleOrder: OrderRecord = {
    id: 'ord-seed-1',
    publicCode: 'BHN7K2M9',
    invoiceNo: `${baseCfg.gstDisplay.invoicePrefix}/26-27/BHN7K2M9`,
    invoiceToken: 'inv-seed-token-99',
    idempotencyKey: 'seed-key-1',
    status: 'shipped',
    paymentStatus: 'captured',
    paymentMethod: 'razorpay',
    mode: 'courier',
    buyerType: 'retail',
    customerName: 'Ananya Sharma',
    phone: '9848054321',
    email: 'ananya@example.com',
    addressSummary: 'Flat 302, Jubilee Enclave, Madhapur, Hyderabad, Telangana 500081',
    pincode: '500081',
    stateCode: '36',
    gstin: '',
    businessName: '',
    placeOfSupplyState: '36',
    isInterState: false,
    pricesInclusive: true,
    subtotal: 31500,
    discount: 0,
    shipping: 8500,
    cgst: 1688,
    sgst: 1687,
    igst: 0,
    tax: 3375,
    total: 40000,
    shipWeightG: 780,
    couponCode: null,
    razorpayOrderId: 'order_seed_123',
    razorpayPaymentId: 'pay_seed_123',
    courierName: 'Delhivery',
    trackingId: 'DLV99482011',
    trackingUrl: 'https://www.delhivery.com/track/package/DLV99482011',
    dispatchBy: '2026-11-26',
    payBy: '2026-11-24T10:15:00.000Z',
    notes: '',
    amountMismatchFlag: false,
    emailFailedFlag: false,
    createdAt: '2026-11-24T10:00:00.000Z',
    updatedAt: '2026-11-25T06:00:00.000Z',
    items: [
      {
        skuId: 'sku-ab-500',
        skuCode: 'ABH-500',
        name: 'Aloo Bhujia (500 g)',
        packLabel: '500 g',
        hsnCode: '21069099',
        gstRate: 12,
        qty: 1,
        unitPaise: 22000,
        taxableValue: 19643,
        cgst: 1179,
        sgst: 1178,
        igst: 0,
        lineTotal: 22000,
      },
      {
        skuId: 'sku-ab-200',
        skuCode: 'ABH-200',
        name: 'Aloo Bhujia (200 g)',
        packLabel: '200 g',
        hsnCode: '21069099',
        gstRate: 12,
        qty: 1,
        unitPaise: 9500,
        taxableValue: 8482,
        cgst: 509,
        sgst: 509,
        igst: 0,
        lineTotal: 9500,
      },
    ],
    paymentAttempts: [{ at: '2026-11-24T10:01:00.000Z', status: 'captured', note: 'Razorpay UPI' }],
    emailLog: [],
  };

  return {
    config: baseCfg,
    categories: structuredClone(SEED_CATEGORIES),
    products: structuredClone(SEED_PRODUCTS),
    skus: structuredClone(SEED_SKUS),
    tiers: structuredClone(SEED_TIERS),
    coupons: structuredClone(SEED_COUPONS),
    customers: structuredClone(SEED_CUSTOMERS),
    orders: [sampleOrder],
    quotes: [
      {
        id: 'qr-seed-1',
        name: 'Ramesh Kirana',
        phone: '9988776655',
        email: 'ramesh@example.com',
        gstin: '36AABCU9603R1ZM',
        items: [{ skuId: 'sku-ab-1000', skuCode: 'ABH-1000', name: 'Aloo Bhujia (1 kg)', qty: 30 }],
        message: 'Need monthly supply quote for 30 kg Aloo Bhujia.',
        status: 'new',
        replyNote: '',
        createdAt: '2026-11-24T12:00:00.000Z',
      },
    ],
    audit: [
      {
        id: 'aud-1',
        actor: 'system',
        action: 'seed:init',
        entity: 'catalog',
        summary: 'Initialized 5 products, 12 SKUs',
        createdAt: '2026-11-24T08:00:00.000Z',
      },
    ],
    priceLog: [],
    reservations: [],
    webhookSeen: new Set<string>(),
  };
}

let DB: MockDb | null = null;
function getDb(): MockDb {
  if (!DB) DB = createInitialDb();
  return DB;
}

export function resetMockDbForConfigSwap(): void {
  DB = createInitialDb();
}

// Background mock reservation expiry cron (P1 #9)
if (typeof window !== 'undefined') {
  window.setInterval(() => {
    const db = getDb();
    const nowIso = getSimulatedNow().toISOString();
    const expiredOrderIds = new Set<string>();
    for (const res of db.reservations) {
      if (!res.released && res.expiresAt < nowIso) {
        const sku = db.skus.find((s) => s.id === res.skuId);
        if (sku) sku.stockQty += res.qty;
        res.released = true;
        expiredOrderIds.add(res.orderId);
      }
    }
    for (const oid of expiredOrderIds) {
      const ord = db.orders.find((o) => o.id === oid && o.status === 'pending_payment');
      if (ord) {
        ord.status = 'expired';
        ord.updatedAt = nowIso;
      }
    }
  }, 5000);
}

async function simulateNetwork(isAdminCall = false): Promise<void> {
  const sim = useDevSimStore.getState();
  if (sim.offline || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    throw new AppError('SERVER', 'You appear to be offline.', undefined, 0);
  }
  if (isAdminCall && sim.sessionExpired) {
    sim.setSim({ sessionExpired: false });
    useAuthStore.getState().setAdminEmail(null);
    throw new AppError('UNAUTHENTICATED', 'Session expired. Please sign in again.', undefined, 401);
  }

  const delay =
    sim.latencyMinMs + Math.random() * Math.max(0, sim.latencyMaxMs - sim.latencyMinMs);
  await new Promise((r) => setTimeout(r, delay));

  const urlFail =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('fail') === '1';
  const rate = urlFail ? Math.max(sim.failRatePct, 30) : sim.failRatePct;
  if (rate > 0 && Math.random() * 100 < rate) {
    throw new AppError('SERVER', 'Simulated network failure (?fail=1 or /dev/sim).', undefined, 500);
  }
}

function isApprovedWholesaleSession(): boolean {
  const buyer = useAuthStore.getState().buyer;
  return Boolean(buyer && buyer.buyerType === 'wholesale' && buyer.wholesaleStatus === 'approved');
}

function stripWholesaleFromSku(sku: Sku, allowWholesale: boolean): Sku {
  if (allowWholesale) return structuredClone(sku);
  const copy = structuredClone(sku);
  delete copy.wholesalePricePaise;
  delete copy.tiers;
  return copy;
}

function dispatchMockEmail(
  event: NotificationEvent,
  to: string,
  data: Parameters<typeof renderNotificationTemplate>[2],
  orderCode?: string
): NotificationMessage {
  const db = getDb();
  const sim = useDevSimStore.getState();
  const rendered = renderNotificationTemplate(event, db.config, data);
  const failed = sim.emailFail;
  const msg: NotificationMessage = {
    id: `msg_${Math.random().toString(36).slice(2, 10)}`,
    event,
    channel: 'email',
    to,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    status: failed ? 'failed' : 'sent',
    createdAt: getSimulatedNow().toISOString(),
    orderCode,
    error: failed ? 'Simulated email transport failure (/dev/sim)' : undefined,
  };
  useOutboxStore.getState().pushMessage(msg);
  return msg;
}

function generateOrderCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let out = '';
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function requireAdminAuth(): string {
  const email = useAuthStore.getState().adminEmail;
  if (!email) throw new AppError('UNAUTHENTICATED', 'Admin sign-in required', undefined, 401);
  return email;
}

function addAudit(actor: string, action: string, entity: string, summary: string) {
  getDb().audit.unshift({
    id: `aud_${Math.random().toString(36).slice(2, 10)}`,
    actor,
    action,
    entity,
    summary,
    createdAt: getSimulatedNow().toISOString(),
  });
}

export const mockApiClient: ApiClient = {
  async getCatalog(): Promise<CatalogResponse> {
    await simulateNetwork(false);
    const db = getDb();
    const allowWs = isApprovedWholesaleSession();
    const sim = useDevSimStore.getState();
    const skus = db.skus.map((s) => {
      const clean = stripWholesaleFromSku(s, allowWs);
      if (sim.priceChange && clean.id === 'sku-ab-200') {
        clean.retailPricePaise += 1000;
      }
      return clean;
    });
    return {
      categories: structuredClone(db.categories),
      products: structuredClone(db.products),
      skus,
      tiers: allowWs ? structuredClone(db.tiers) : [],
      coupons: structuredClone(db.coupons),
    };
  },

  async getProductBySlug(slug: string) {
    await simulateNetwork(false);
    const db = getDb();
    const allowWs = isApprovedWholesaleSession();
    let product = db.products.find((p) => p.slug === slug && p.status !== 'archived');
    let redirectedFrom: string | undefined;
    if (!product) {
      product = db.products.find((p) => p.slugHistory.includes(slug) && p.status !== 'archived');
      if (product) redirectedFrom = slug;
    }
    if (!product) throw new AppError('NOT_FOUND', 'Product not found', undefined, 404);
    const category = db.categories.find((c) => c.id === product.categoryId) || null;
    const skus = db.skus
      .filter((s) => s.productId === product!.id && s.status !== 'archived')
      .map((s) => stripWholesaleFromSku(s, allowWs));
    const tiers = allowWs
      ? db.tiers.filter((t) => skus.some((s) => s.id === t.skuId))
      : [];
    return { product: structuredClone(product), category, skus, tiers, redirectedFrom };
  },

  async getConfigPublic(): Promise<ClientConfig> {
    const db = getDb();
    const sim = useDevSimStore.getState();
    const cfg = structuredClone(db.config);
    if (sim.shopCloseMidCheckout) {
      cfg.shopStatusMode = 'manual';
      cfg.manualShopStatus = 'closed';
      cfg.manualStatusNote = 'Closed temporarily for urgent batch maintenance. Reopens at 5:00 pm IST.';
    }
    return cfg;
  },

  async getShopStatus() {
    const cfg = await this.getConfigPublic();
    return getShopStatus(cfg, getSimulatedNow());
  },

  async quoteCart(payload) {
    await simulateNetwork(false);
    const db = getDb();
    const sim = useDevSimStore.getState();
    const cfg = await this.getConfigPublic();
    const allowWs = isApprovedWholesaleSession();

    const skus = db.skus.map((s) => {
      const clone = structuredClone(s);
      if (sim.priceChange && clone.id === 'sku-ab-200') {
        clone.retailPricePaise += 1000;
      }
      return clone;
    });

    return computeQuote({
      lines: payload.lines,
      buyerType: allowWs ? 'wholesale' : 'retail',
      mode: payload.mode,
      pincode: payload.pincode,
      stateCode: payload.stateCode,
      couponCode: payload.couponCode,
      gstin: payload.gstin,
      now: getSimulatedNow(),
      config: cfg,
      catalog: {
        products: db.products,
        skus,
        tiers: allowWs ? db.tiers : [],
        coupons: db.coupons,
      },
      sessionApprovedWholesale: allowWs,
    });
  },

  async createOrder(payload: CreateOrderInput, idempotencyKey: string): Promise<OrderRecord> {
    await simulateNetwork(false);
    const db = getDb();
    const sim = useDevSimStore.getState();

    // Idempotent hit
    const existing = db.orders.find((o) => o.idempotencyKey === idempotencyKey);
    if (existing) return structuredClone(existing);

    const cfg = await this.getConfigPublic();
    const allowWs = isApprovedWholesaleSession();
    const now = getSimulatedNow();

    // Simulate stock race: drop last pack before validating
    if (sim.stockRace && payload.lines.length > 0) {
      const targetSku = db.skus.find((s) => s.id === payload.lines[0].skuId);
      if (targetSku) targetSku.stockQty = 0;
      sim.setSim({ stockRace: false });
    }

    const quote = computeQuote({
      lines: payload.lines,
      buyerType: allowWs ? 'wholesale' : 'retail',
      mode: payload.mode,
      pincode: payload.pincode,
      stateCode: payload.stateCode,
      couponCode: payload.couponCode,
      gstin: payload.gstin,
      now,
      config: cfg,
      catalog: {
        products: db.products,
        skus: db.skus,
        tiers: allowWs ? db.tiers : [],
        coupons: db.coupons,
      },
      sessionApprovedWholesale: allowWs,
    });

    if (!quote.ok) {
      const firstErr = quote.errors[0];
      throw new AppError(firstErr?.code || 'VALIDATION', firstErr?.message || 'Cannot place order', undefined, 409);
    }

    if (payload.paymentMethod === 'cod') {
      if (!cfg.features.cod || !cfg.cod) {
        throw new AppError('VALIDATION', 'Cash on Delivery is disabled.', 'paymentMethod', 400);
      }
      if (quote.total > cfg.codMaxPaise) {
        throw new AppError('VALIDATION', 'Order exceeds Cash on Delivery limit.', 'paymentMethod', 400);
      }
    }

    if (payload.mode !== 'pickup' && (!payload.addressLine1 || payload.addressLine1.trim().length < 5)) {
      throw new AppError('VALIDATION', 'Please enter your delivery street address.', 'addressLine1', 400);
    }

    // Reserve / decrement stock atomically
    for (const line of quote.lines) {
      const sku = db.skus.find((s) => s.id === line.skuId)!;
      sku.stockQty -= line.qty;
    }

    if (quote.appliedCoupon) {
      const cp = db.coupons.find((c) => c.code === quote.appliedCoupon);
      if (cp) cp.usedCount += 1;
    }

    const publicCode = generateOrderCode();
    const orderId = `ord_${Math.random().toString(36).slice(2, 10)}`;
    const nowIso = now.toISOString();
    const payBy = new Date(now.getTime() + 15 * 60_000).toISOString();
    const fy = getFinancialYearCode(now);

    const paymentProvider = createMockPaymentProvider(cfg.payments.provider);
    let razorpayOrderId: string | null = null;
    if (payload.paymentMethod === 'razorpay') {
      const rp = await paymentProvider.createPayment({ publicCode, totalPaise: quote.total });
      razorpayOrderId = rp.providerOrderId;
    }

    const addressParts = [
      payload.addressLine1,
      payload.addressLine2,
      payload.landmark ? `Near ${payload.landmark}` : '',
      payload.pincode ? `Pincode ${payload.pincode}` : '',
    ].filter(Boolean);

    const order: OrderRecord = {
      id: orderId,
      publicCode,
      invoiceNo: payload.paymentMethod === 'cod' ? `${cfg.gstDisplay.invoicePrefix}/${fy}/${publicCode}` : null,
      invoiceToken: `tok_${Math.random().toString(36).slice(2, 14)}`,
      idempotencyKey,
      status: payload.paymentMethod === 'cod' ? 'paid' : 'pending_payment',
      paymentStatus: payload.paymentMethod === 'cod' ? 'cod_pending' : 'pending',
      paymentMethod: payload.paymentMethod,
      mode: payload.mode,
      buyerType: allowWs ? 'wholesale' : 'retail',
      customerName: payload.customerName,
      phone: payload.phone,
      email: payload.email || '',
      addressSummary: payload.mode === 'pickup' ? 'Store Pickup' : addressParts.join(', '),
      pincode: payload.pincode || '',
      stateCode: payload.stateCode,
      gstin: payload.gstin?.toUpperCase() || '',
      businessName: payload.businessName || '',
      placeOfSupplyState: quote.placeOfSupplyState,
      isInterState: quote.isInterState,
      pricesInclusive: quote.pricesInclusive,
      subtotal: quote.subtotal,
      discount: quote.discount,
      shipping: quote.shipping,
      cgst: quote.cgst,
      sgst: quote.sgst,
      igst: quote.igst,
      tax: quote.tax,
      total: quote.total,
      shipWeightG: quote.shipWeightG,
      couponCode: quote.appliedCoupon,
      razorpayOrderId,
      razorpayPaymentId: null,
      courierName: null,
      trackingId: null,
      trackingUrl: null,
      dispatchBy: quote.dispatchBy,
      payBy,
      notes: payload.notes || '',
      amountMismatchFlag: false,
      emailFailedFlag: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      items: quote.lines.map((l) => ({
        skuId: l.skuId,
        skuCode: l.skuCode,
        name: l.name,
        packLabel: l.packLabel,
        hsnCode: l.hsnCode,
        gstRate: l.gstRate,
        qty: l.qty,
        unitPaise: l.unitPaise,
        taxableValue: l.taxableValue,
        cgst: l.cgst,
        sgst: l.sgst,
        igst: l.igst,
        lineTotal: l.lineTotal,
      })),
      paymentAttempts: [],
      emailLog: [],
    };

    if (payload.paymentMethod === 'razorpay') {
      for (const l of quote.lines) {
        db.reservations.push({
          orderId: order.id,
          skuId: l.skuId,
          qty: l.qty,
          expiresAt: payBy,
          released: false,
        });
      }
    } else {
      // COD confirmed immediately -> dispatch emails
      const emailData = {
        publicCode: order.publicCode,
        customerName: order.customerName,
        totalPaise: order.total,
        items: order.items.map((i) => ({ name: i.name, qty: i.qty, lineTotal: i.lineTotal })),
        addressSummary: order.addressSummary,
        dispatchBy: order.dispatchBy,
        statusUrl: `/order/${order.publicCode}`,
        invoiceUrl: `/invoice/${order.publicCode}?t=${order.invoiceToken}`,
      };
      if (order.email) {
        const custMsg = dispatchMockEmail('order_placed', order.email, emailData, order.publicCode);
        order.emailLog.push(custMsg);
        if (custMsg.status === 'failed') order.emailFailedFlag = true;
      }
      const ownerMsg = dispatchMockEmail('owner_alert', cfg.adminAllowlist[0], emailData, order.publicCode);
      order.emailLog.push(ownerMsg);
      if (ownerMsg.status === 'failed') order.emailFailedFlag = true;
    }

    db.orders.unshift(order);
    return structuredClone(order);
  },

  async getOrder(code: string, last4: string) {
    await simulateNetwork(false);
    const db = getDb();
    const ord = db.orders.find((o) => o.publicCode === code.toUpperCase());
    if (!ord || !last4 || !ord.phone.endsWith(last4.trim())) {
      throw new AppError('NOT_FOUND', 'Order not found or phone digits do not match.', undefined, 404);
    }
    return structuredClone(ord);
  },

  async getOrderByInvoiceToken(code: string, token: string) {
    await simulateNetwork(false);
    const ord = getDb().orders.find((o) => o.publicCode === code.toUpperCase() && o.invoiceToken === token);
    if (!ord) throw new AppError('FORBIDDEN', 'Invoice link invalid or expired.', undefined, 403);
    return structuredClone(ord);
  },

  async createRazorpayOrder(publicCode: string) {
    await simulateNetwork(false);
    const db = getDb();
    const ord = db.orders.find((o) => o.publicCode === publicCode);
    if (!ord) throw new AppError('NOT_FOUND', 'Order not found', undefined, 404);
    if (!ord.razorpayOrderId) {
      const rp = await createMockPaymentProvider(db.config.payments.provider).createPayment({
        publicCode: ord.publicCode,
        totalPaise: ord.total,
      });
      ord.razorpayOrderId = rp.providerOrderId;
    }
    return { razorpayOrderId: ord.razorpayOrderId, amountPaise: ord.total };
  },

  async verifyRazorpayPayment(payload) {
    await simulateNetwork(false);
    const db = getDb();
    const sim = useDevSimStore.getState();
    const ord = db.orders.find((o) => o.publicCode === payload.publicCode);
    if (!ord) throw new AppError('NOT_FOUND', 'Order not found', undefined, 404);

    if (sim.paymentFail) {
      ord.paymentStatus = 'failed';
      ord.paymentAttempts.push({ at: getSimulatedNow().toISOString(), status: 'failed', note: 'Simulated payment decline' });
      throw new AppError('PAYMENT_FAILED', 'Payment declined by bank (simulated).', undefined, 400);
    }

    ord.paymentAttempts.push({
      at: getSimulatedNow().toISOString(),
      status: 'callback_received',
      note: `Payment ${payload.razorpayPaymentId}`,
    });

    const finalizePaid = () => {
      const eventKey = `${ord.publicCode}:${payload.razorpayPaymentId}`;
      if (sim.webhookDuplicate && db.webhookSeen.has(eventKey)) {
        return; // Deduplicated: exactly one confirmation email & status flip
      }
      db.webhookSeen.add(eventKey);

      if (sim.amountMismatch) {
        ord.amountMismatchFlag = true;
        ord.paymentStatus = 'amount_mismatch';
        ord.updatedAt = getSimulatedNow().toISOString();
        return;
      }

      if (ord.status === 'pending_payment' || ord.status === 'expired') {
        const now = getSimulatedNow();
        ord.status = 'paid';
        ord.paymentStatus = 'captured';
        ord.razorpayPaymentId = payload.razorpayPaymentId;
        ord.invoiceNo = ord.invoiceNo || `${db.config.gstDisplay.invoicePrefix}/${getFinancialYearCode(now)}/${ord.publicCode}`;
        ord.updatedAt = now.toISOString();
        for (const r of db.reservations) {
          if (r.orderId === ord.id) r.released = true;
        }
        const emailData = {
          publicCode: ord.publicCode,
          customerName: ord.customerName,
          totalPaise: ord.total,
          items: ord.items.map((i) => ({ name: i.name, qty: i.qty, lineTotal: i.lineTotal })),
          addressSummary: ord.addressSummary,
          dispatchBy: ord.dispatchBy,
          statusUrl: `/order/${ord.publicCode}`,
          invoiceUrl: `/invoice/${ord.publicCode}?t=${ord.invoiceToken}`,
        };
        if (ord.email) {
          const m = dispatchMockEmail('order_placed', ord.email, emailData, ord.publicCode);
          ord.emailLog.push(m);
          if (m.status === 'failed') ord.emailFailedFlag = true;
        }
        const ownerM = dispatchMockEmail('owner_alert', db.config.adminAllowlist[0], emailData, ord.publicCode);
        ord.emailLog.push(ownerM);
        if (ownerM.status === 'failed') ord.emailFailedFlag = true;
      }
    };

    if (sim.webhookLateSec > 0) {
      // Simulate delayed webhook confirmation while returning pending_payment right now
      setTimeout(() => {
        finalizePaid();
        if (sim.webhookDuplicate) finalizePaid();
      }, Math.min(sim.webhookLateSec, 25) * 1000);
      return { ok: true, order: structuredClone(ord) };
    }

    finalizePaid();
    if (sim.webhookDuplicate) finalizePaid();
    return { ok: true, order: structuredClone(ord) };
  },

  async requestOtp({ email, role }) {
    await simulateNetwork(false);
    const db = getDb();
    const norm = email.trim().toLowerCase();
    if (role === 'admin') {
      const allowed = db.config.adminAllowlist.map((e) => e.toLowerCase());
      if (!allowed.includes(norm)) {
        throw new AppError('FORBIDDEN', 'If this email is authorised, a code has been sent.', undefined, 403);
      }
    } else {
      const cust = db.customers.find((c) => c.email.toLowerCase() === norm && c.buyerType === 'wholesale');
      if (!cust) {
        throw new AppError('NOT_FOUND', 'Wholesale email not found. Register first.', undefined, 404);
      }
    }
    dispatchMockEmail('otp', norm, { otpCode: '123456' });
    return { ok: true, devOtpHint: '123456' };
  },

  async verifyOtp({ email, otp, role }) {
    await simulateNetwork(false);
    if (otp.trim() !== '123456') {
      throw new AppError('VALIDATION', 'Invalid OTP. DEV mock accepts 123456.', 'otp', 401);
    }
    const norm = email.trim().toLowerCase();
    if (role === 'admin') {
      useAuthStore.getState().setAdminEmail(norm);
      return { ok: true, email: norm };
    }
    const cust = getDb().customers.find((c) => c.email.toLowerCase() === norm && c.buyerType === 'wholesale');
    if (!cust) throw new AppError('NOT_FOUND', 'Buyer not found', undefined, 404);
    useAuthStore.getState().setBuyer(structuredClone(cust));
    return { ok: true, email: norm, buyer: structuredClone(cust) };
  },

  async logout(role) {
    if (role === 'admin') useAuthStore.getState().setAdminEmail(null);
    else useAuthStore.getState().setBuyer(null);
  },

  async registerWholesale(input) {
    await simulateNetwork(false);
    const db = getDb();
    const cust: Customer = {
      id: `cust_${Math.random().toString(36).slice(2, 10)}`,
      name: input.ownerName,
      phone: input.phone,
      email: input.email.toLowerCase(),
      buyerType: 'wholesale',
      businessName: input.businessName,
      gstin: input.gstin.toUpperCase(),
      stateCode: input.stateCode,
      address: input.address,
      wholesaleStatus: 'pending',
      createdAt: getSimulatedNow().toISOString(),
    };
    const idx = db.customers.findIndex((c) => c.email.toLowerCase() === cust.email);
    if (idx >= 0) db.customers[idx] = cust;
    else db.customers.unshift(cust);
    useAuthStore.getState().setBuyer(structuredClone(cust));
    dispatchMockEmail('owner_alert', db.config.adminAllowlist[0], {
      customerName: `${cust.businessName} (${cust.gstin})`,
      publicCode: 'WHOLESALE-REG',
      totalPaise: 0,
      items: [],
    });
    return structuredClone(cust);
  },

  async getWholesaleMe() {
    await simulateNetwork(false);
    const buyer = useAuthStore.getState().buyer;
    if (!buyer) return { buyer: null, orders: [], quotes: [] };
    const db = getDb();
    const freshBuyer = db.customers.find((c) => c.id === buyer.id) || buyer;
    useAuthStore.getState().setBuyer(structuredClone(freshBuyer));
    const orders = db.orders.filter((o) => o.phone === freshBuyer.phone || o.email === freshBuyer.email);
    const quotes = db.quotes.filter((q) => q.phone === freshBuyer.phone || q.email === freshBuyer.email);
    return { buyer: structuredClone(freshBuyer), orders: structuredClone(orders), quotes: structuredClone(quotes) };
  },

  async submitQuoteRequest(input) {
    await simulateNetwork(false);
    const db = getDb();
    const items = input.items.map((it) => {
      const sku = db.skus.find((s) => s.id === it.skuId);
      const prod = sku ? db.products.find((p) => p.id === sku.productId) : undefined;
      return {
        skuId: it.skuId,
        skuCode: sku?.skuCode || it.skuId,
        name: prod ? `${prod.name} (${sku?.packLabel || ''})` : it.skuId,
        qty: it.qty,
      };
    });
    const req: WholesaleQuoteRequest = {
      id: `qr_${Math.random().toString(36).slice(2, 10)}`,
      name: input.name,
      phone: input.phone,
      email: input.email || '',
      gstin: input.gstin?.toUpperCase() || '',
      items,
      message: input.message,
      status: 'new',
      replyNote: '',
      createdAt: getSimulatedNow().toISOString(),
    };
    db.quotes.unshift(req);
    dispatchMockEmail('owner_alert', db.config.adminAllowlist[0], {
      publicCode: 'QUOTE-REQ',
      customerName: `${req.name} (${req.phone})`,
      totalPaise: 0,
      items: req.items.map((i) => ({ name: i.name, qty: i.qty, lineTotal: 0 })),
    });
    return structuredClone(req);
  },

  // --- ADMIN ---
  async adminGetOrders(statusFilter) {
    await simulateNetwork(true);
    requireAdminAuth();
    const list = getDb().orders.filter((o) => !statusFilter || statusFilter === 'all' || o.status === statusFilter);
    return structuredClone(list);
  },

  async adminGetOrder(id) {
    await simulateNetwork(true);
    requireAdminAuth();
    const ord = getDb().orders.find((o) => o.id === id || o.publicCode === id);
    if (!ord) throw new AppError('NOT_FOUND', 'Order not found', undefined, 404);
    return structuredClone(ord);
  },

  async adminTransitionOrder(id, nextStatus, reason) {
    await simulateNetwork(true);
    const actor = requireAdminAuth();
    const db = getDb();
    const ord = db.orders.find((o) => o.id === id);
    if (!ord) throw new AppError('NOT_FOUND', 'Order not found', undefined, 404);
    assertOrderTransition(ord.status, nextStatus);
    const prev = ord.status;
    ord.status = nextStatus;
    if (nextStatus === 'refunded') ord.paymentStatus = 'refunded';
    ord.updatedAt = getSimulatedNow().toISOString();
    addAudit(actor, `order:${nextStatus}`, ord.publicCode, `${prev} -> ${nextStatus}${reason ? ` (${reason})` : ''}`);

    if (ord.email && (nextStatus === 'delivered' || nextStatus === 'cancelled' || nextStatus === 'refunded')) {
      const ev: NotificationEvent =
        nextStatus === 'delivered' ? 'delivered' : nextStatus === 'refunded' ? 'refund_issued' : 'cancelled';
      const msg = dispatchMockEmail(
        ev,
        ord.email,
        { publicCode: ord.publicCode, customerName: ord.customerName, totalPaise: ord.total, reason },
        ord.publicCode
      );
      ord.emailLog.push(msg);
      if (msg.status === 'failed') ord.emailFailedFlag = true;
    }
    return structuredClone(ord);
  },

  async adminMarkShipped(id, payload) {
    await simulateNetwork(true);
    const actor = requireAdminAuth();
    const db = getDb();
    const ord = db.orders.find((o) => o.id === id);
    if (!ord) throw new AppError('NOT_FOUND', 'Order not found', undefined, 404);
    assertOrderTransition(ord.status, 'shipped');
    if (db.config.shipping.trackingRequired && (!payload.courierName || !payload.trackingId.trim())) {
      throw new AppError('VALIDATION', 'Courier and AWB tracking ID are required.', 'trackingId', 400);
    }
    const provider = createConfigCourierProvider(db.config, payload.courierName);
    ord.status = 'shipped';
    ord.courierName = payload.courierName;
    ord.trackingId = payload.trackingId.trim();
    ord.trackingUrl = payload.trackingUrl?.trim() || provider.trackingUrl(ord.trackingId);
    if (payload.weightG) ord.shipWeightG = payload.weightG;
    ord.updatedAt = getSimulatedNow().toISOString();
    addAudit(actor, 'order:dispatched', ord.publicCode, `${ord.courierName} AWB ${ord.trackingId}`);

    if (ord.email) {
      const msg = dispatchMockEmail(
        'dispatched',
        ord.email,
        {
          publicCode: ord.publicCode,
          customerName: ord.customerName,
          courierName: ord.courierName,
          trackingId: ord.trackingId,
          trackingUrl: ord.trackingUrl,
          statusUrl: `/order/${ord.publicCode}`,
        },
        ord.publicCode
      );
      ord.emailLog.push(msg);
      if (msg.status === 'failed') ord.emailFailedFlag = true;
    }
    return structuredClone(ord);
  },

  async adminResolveMismatch(id) {
    await simulateNetwork(true);
    const actor = requireAdminAuth();
    const ord = getDb().orders.find((o) => o.id === id);
    if (!ord) throw new AppError('NOT_FOUND', 'Order not found', undefined, 404);
    ord.amountMismatchFlag = false;
    ord.paymentStatus = 'captured';
    ord.status = 'paid';
    ord.updatedAt = getSimulatedNow().toISOString();
    addAudit(actor, 'order:mismatch_resolved', ord.publicCode, 'Marked verified by admin');
    return structuredClone(ord);
  },

  async adminRetryEmail(orderId) {
    await simulateNetwork(true);
    const actor = requireAdminAuth();
    const ord = getDb().orders.find((o) => o.id === orderId);
    if (!ord) throw new AppError('NOT_FOUND', 'Order not found', undefined, 404);
    if (ord.email) {
      const msg = dispatchMockEmail(
        'order_placed',
        ord.email,
        {
          publicCode: ord.publicCode,
          customerName: ord.customerName,
          totalPaise: ord.total,
          items: ord.items.map((i) => ({ name: i.name, qty: i.qty, lineTotal: i.lineTotal })),
          addressSummary: ord.addressSummary,
          dispatchBy: ord.dispatchBy,
          statusUrl: `/order/${ord.publicCode}`,
          invoiceUrl: `/invoice/${ord.publicCode}?t=${ord.invoiceToken}`,
        },
        ord.publicCode
      );
      ord.emailLog.push(msg);
      ord.emailFailedFlag = msg.status === 'failed';
    } else {
      ord.emailFailedFlag = false;
    }
    addAudit(actor, 'order:email_retry', ord.publicCode, ord.emailFailedFlag ? 'Retry failed' : 'Retry sent');
    return structuredClone(ord);
  },

  async adminUpsertProduct(input) {
    await simulateNetwork(true);
    const actor = requireAdminAuth();
    const db = getDb();
    const nowIso = getSimulatedNow().toISOString();
    if (input.id) {
      const idx = db.products.findIndex((p) => p.id === input.id);
      if (idx === -1) throw new AppError('NOT_FOUND', 'Product not found', undefined, 404);
      const prev = db.products[idx];
      const slugHistory =
        input.slug && input.slug !== prev.slug
          ? Array.from(new Set([...prev.slugHistory, prev.slug]))
          : prev.slugHistory;
      const updated: Product = { ...prev, ...input, slugHistory, updatedAt: nowIso };
      db.products[idx] = updated;
      addAudit(actor, 'product:update', updated.slug, `Updated ${updated.name}`);
      return structuredClone(updated);
    }
    const created: Product = {
      id: `prod_${Math.random().toString(36).slice(2, 9)}`,
      categoryId: input.categoryId || db.categories[0].id,
      slug: input.slug || `item-${Date.now().toString(36)}`,
      slugHistory: [],
      name: input.name || 'New Namkeen',
      description: input.description || '',
      ingredients: input.ingredients || 'Besan, Spices, Edible Oil',
      allergens: input.allergens || '',
      veg: input.veg ?? true,
      hsnCode: input.hsnCode || '21069099',
      gstRate: input.gstRate ?? 12,
      shelfLifeDays: input.shelfLifeDays ?? 90,
      storage: input.storage || 'Store in a cool, dry place.',
      bestseller: input.bestseller ?? false,
      imageUrl: input.imageUrl ?? null,
      altText: input.altText || input.name || 'Packaged snack',
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      faq: input.faq || [],
      synonyms: input.synonyms || [],
      searchKeywords: input.searchKeywords || [],
      status: input.status || 'active',
      updatedAt: nowIso,
    };
    db.products.unshift(created);
    addAudit(actor, 'product:create', created.slug, `Created ${created.name}`);
    return structuredClone(created);
  },

  async adminUpsertSku(input) {
    await simulateNetwork(true);
    const actor = requireAdminAuth();
    const db = getDb();
    const nowIso = getSimulatedNow().toISOString();

    if (input.id) {
      const idx = db.skus.findIndex((s) => s.id === input.id);
      if (idx === -1) throw new AppError('NOT_FOUND', 'SKU not found', undefined, 404);
      const prev = db.skus[idx];

      // Part J3: Lock sku_code once ordered
      if (input.skuCode && input.skuCode !== prev.skuCode) {
        const usedInOrder = db.orders.some((o) => o.items.some((i) => i.skuId === prev.id));
        if (usedInOrder) {
          throw new AppError(
            'FORBIDDEN',
            `SKU code ${prev.skuCode} is used in existing orders and cannot be renamed. Archive it and create a new SKU.`,
            'skuCode',
            409
          );
        }
      }

      const next: Sku = { ...prev, ...input };
      db.skus[idx] = next;
      if (prev.retailPricePaise !== next.retailPricePaise) {
        db.priceLog.unshift({
          id: `pl_${Math.random().toString(36).slice(2, 9)}`,
          skuId: next.id,
          skuCode: next.skuCode,
          oldRetailPaise: prev.retailPricePaise,
          newRetailPaise: next.retailPricePaise,
          changedBy: actor,
          changedAt: nowIso,
        });
      }
      addAudit(actor, 'sku:update', next.skuCode, `Stock ${next.stockQty}, Retail ₹${(next.retailPricePaise / 100).toFixed(2)}`);
      return structuredClone(next);
    }

    const created: Sku = {
      id: `sku_${Math.random().toString(36).slice(2, 9)}`,
      productId: input.productId,
      skuCode: input.skuCode || `SKU-${Date.now().toString(36).toUpperCase()}`,
      packLabel: input.packLabel || '200 g',
      netWeightG: input.netWeightG || 200,
      shipWeightG: input.shipWeightG || 230,
      mrpPaise: input.mrpPaise || 10000,
      retailPricePaise: input.retailPricePaise || 9500,
      wholesalePricePaise: input.wholesalePricePaise ?? 7000,
      wholesaleMoq: input.wholesaleMoq || 10,
      stockQty: input.stockQty ?? 25,
      lowStockAt: input.lowStockAt ?? 10,
      status: input.status || 'active',
    };
    db.skus.push(created);
    addAudit(actor, 'sku:create', created.skuCode, `Created ${created.packLabel}`);
    return structuredClone(created);
  },

  async adminCsvDryRun(rows) {
    await simulateNetwork(true);
    requireAdminAuth();
    const errors: Array<{ row: number; error: string }> = [];
    const seen = new Set<string>();
    rows.forEach((r, idx) => {
      const parsed = CsvImportRowSchema.safeParse(r);
      if (!parsed.success) {
        errors.push({
          row: idx + 1,
          error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
        });
        return;
      }
      if (seen.has(parsed.data.sku_code)) {
        errors.push({ row: idx + 1, error: `Duplicate sku_code in CSV: ${parsed.data.sku_code}` });
        return;
      }
      seen.add(parsed.data.sku_code);
    });
    return { ok: errors.length === 0, errors, validCount: rows.length - errors.length };
  },

  async adminCsvCommit(rows) {
    await simulateNetwork(true);
    const actor = requireAdminAuth();
    const dry = await this.adminCsvDryRun(rows);
    if (!dry.ok) throw new AppError('VALIDATION', 'CSV has validation errors; nothing imported.', undefined, 400);

    const db = getDb();
    const nowIso = getSimulatedNow().toISOString();
    let count = 0;
    for (const raw of rows) {
      const r = CsvImportRowSchema.parse(raw);
      let cat = db.categories.find((c) => c.slug === r.category_slug);
      if (!cat) {
        cat = {
          id: `cat_${r.category_slug}`,
          slug: r.category_slug,
          name: r.category_slug.replace(/-/g, ' '),
          description: 'Imported category',
          sortOrder: db.categories.length + 1,
          active: true,
        };
        db.categories.push(cat);
      }
      let prod = db.products.find((p) => p.slug === r.product_slug);
      if (!prod) {
        prod = {
          id: `prod_${r.product_slug}`,
          categoryId: cat.id,
          slug: r.product_slug,
          slugHistory: [],
          name: r.product_name,
          description: r.product_name,
          ingredients: r.ingredients,
          allergens: '',
          veg: r.veg === '1' || r.veg === 'true',
          hsnCode: r.hsn_code,
          gstRate: r.gst_rate,
          shelfLifeDays: r.shelf_life_days,
          storage: 'Store in a cool, dry place.',
          bestseller: false,
          imageUrl: null,
          altText: r.product_name,
          faq: [],
          synonyms: [],
          searchKeywords: [],
          status: r.status,
          updatedAt: nowIso,
        };
        db.products.push(prod);
      }
      const existingSku = db.skus.find((s) => s.skuCode === r.sku_code);
      if (existingSku) {
        existingSku.packLabel = r.pack_label;
        existingSku.netWeightG = r.net_weight_g;
        existingSku.shipWeightG = r.ship_weight_g;
        existingSku.mrpPaise = Math.round(r.mrp_rupees * 100);
        existingSku.retailPricePaise = Math.round(r.retail_rupees * 100);
        existingSku.wholesalePricePaise = r.wholesale_rupees ? Math.round(r.wholesale_rupees * 100) : null;
        existingSku.wholesaleMoq = r.wholesale_moq;
        existingSku.stockQty = r.stock_qty;
        existingSku.status = r.status;
      } else {
        db.skus.push({
          id: `sku_${r.sku_code.toLowerCase()}`,
          productId: prod.id,
          skuCode: r.sku_code,
          packLabel: r.pack_label,
          netWeightG: r.net_weight_g,
          shipWeightG: r.ship_weight_g,
          mrpPaise: Math.round(r.mrp_rupees * 100),
          retailPricePaise: Math.round(r.retail_rupees * 100),
          wholesalePricePaise: r.wholesale_rupees ? Math.round(r.wholesale_rupees * 100) : null,
          wholesaleMoq: r.wholesale_moq,
          stockQty: r.stock_qty,
          lowStockAt: 10,
          status: r.status,
        });
      }
      count++;
    }
    addAudit(actor, 'catalog:csv_import', 'skus', `Imported ${count} SKU rows`);
    return { imported: count };
  },

  async adminGetBuyers() {
    await simulateNetwork(true);
    requireAdminAuth();
    return structuredClone(getDb().customers.filter((c) => c.buyerType === 'wholesale'));
  },

  async adminApproveBuyer(id) {
    await simulateNetwork(true);
    const actor = requireAdminAuth();
    const db = getDb();
    const b = db.customers.find((c) => c.id === id);
    if (!b) throw new AppError('NOT_FOUND', 'Buyer not found', undefined, 404);
    b.wholesaleStatus = 'approved';
    b.rejectReason = undefined;
    dispatchMockEmail('wholesale_approved', b.email, { businessName: b.businessName });
    addAudit(actor, 'wholesale:approve', b.businessName || b.email, `Approved GSTIN ${b.gstin}`);
    return structuredClone(b);
  },

  async adminRejectBuyer(id, reason) {
    await simulateNetwork(true);
    const actor = requireAdminAuth();
    const db = getDb();
    const b = db.customers.find((c) => c.id === id);
    if (!b) throw new AppError('NOT_FOUND', 'Buyer not found', undefined, 404);
    b.wholesaleStatus = 'rejected';
    b.rejectReason = reason;
    dispatchMockEmail('wholesale_rejected', b.email, { businessName: b.businessName, reason });
    addAudit(actor, 'wholesale:reject', b.businessName || b.email, reason);
    return structuredClone(b);
  },

  async adminGetQuotes() {
    await simulateNetwork(true);
    requireAdminAuth();
    return structuredClone(getDb().quotes);
  },

  async adminUpdateQuote(id, status, replyNote) {
    await simulateNetwork(true);
    const actor = requireAdminAuth();
    const q = getDb().quotes.find((x) => x.id === id);
    if (!q) throw new AppError('NOT_FOUND', 'Quote request not found', undefined, 404);
    q.status = status;
    q.replyNote = replyNote;
    addAudit(actor, 'quote:update', q.id, `Status ${status}`);
    return structuredClone(q);
  },

  async adminUpdateShippingRates(rates) {
    await simulateNetwork(true);
    const actor = requireAdminAuth();
    const db = getDb();
    db.config.shippingRates = structuredClone(rates);
    addAudit(actor, 'shipping:update', 'slabs', `Updated ${rates.length} slabs`);
    return structuredClone(db.config);
  },

  async adminUpdateZones(zones) {
    await simulateNetwork(true);
    const actor = requireAdminAuth();
    const db = getDb();
    db.config.zones = structuredClone(zones);
    addAudit(actor, 'zones:update', 'pincodes', `Updated ${zones.length} local zones`);
    return structuredClone(db.config);
  },

  async adminUpsertCoupon(coupon) {
    await simulateNetwork(true);
    const actor = requireAdminAuth();
    const db = getDb();
    const idx = db.coupons.findIndex((c) => c.code.toUpperCase() === coupon.code.toUpperCase());
    if (idx >= 0) db.coupons[idx] = { ...coupon, code: coupon.code.toUpperCase() };
    else db.coupons.unshift({ ...coupon, code: coupon.code.toUpperCase() });
    addAudit(actor, 'coupon:upsert', coupon.code.toUpperCase(), `${coupon.type} ${coupon.value}`);
    return structuredClone(db.coupons);
  },

  async adminUpdateSettings(patch) {
    await simulateNetwork(true);
    const actor = requireAdminAuth();
    const db = getDb();
    db.config = { ...db.config, ...patch };
    addAudit(actor, 'settings:update', 'config', 'Updated store settings');
    return structuredClone(db.config);
  },

  async adminSetShopSwitch(status, busyMinutes = 0, note = '') {
    await simulateNetwork(true);
    const actor = requireAdminAuth();
    const db = getDb();
    db.config.shopStatusMode = 'manual';
    db.config.manualShopStatus = status;
    db.config.manualBusyMinutes = busyMinutes;
    db.config.manualStatusNote = note;
    addAudit(actor, 'shop:switch', 'status', `Set ${status} (${note || 'no note'})`);
    return structuredClone(db.config);
  },

  async adminGetReports() {
    await simulateNetwork(true);
    requireAdminAuth();
    const db = getDb();
    const now = getSimulatedNow();
    const todayIst = getIstDateString(now);
    const d7 = now.getTime() - 7 * 86_400_000;
    const d30 = now.getTime() - 30 * 86_400_000;

    let todayOrders = 0;
    let todayRevenuePaise = 0;
    let sevenDayRevenuePaise = 0;
    let thirtyDayRevenuePaise = 0;
    const skuTotals = new Map<string, { skuCode: string; name: string; qty: number; revenuePaise: number }>();

    for (const o of db.orders) {
      if (o.status === 'cancelled' || o.status === 'expired' || o.status === 'refunded') continue;
      const oIst = getIstDateString(new Date(o.createdAt));
      const oTs = new Date(o.createdAt).getTime();
      if (oIst === todayIst) {
        todayOrders++;
        todayRevenuePaise += o.total;
      }
      if (oTs >= d7) sevenDayRevenuePaise += o.total;
      if (oTs >= d30) thirtyDayRevenuePaise += o.total;

      for (const it of o.items) {
        const cur = skuTotals.get(it.skuCode) || { skuCode: it.skuCode, name: it.name, qty: 0, revenuePaise: 0 };
        cur.qty += it.qty;
        cur.revenuePaise += it.lineTotal;
        skuTotals.set(it.skuCode, cur);
      }
    }

    const topSkus = Array.from(skuTotals.values())
      .sort((a, b) => b.revenuePaise - a.revenuePaise)
      .slice(0, 6);

    return { todayOrders, todayRevenuePaise, sevenDayRevenuePaise, thirtyDayRevenuePaise, topSkus };
  },

  async adminGetAudit() {
    await simulateNetwork(true);
    requireAdminAuth();
    const db = getDb();
    return {
      audit: structuredClone(db.audit),
      priceLog: structuredClone(db.priceLog),
    };
  },

  async adminExportAll() {
    await simulateNetwork(true);
    const actor = requireAdminAuth();
    addAudit(actor, 'backup:export', 'all', 'Exported full JSON snapshot');
    return JSON.stringify(getDb(), null, 2);
  },
};
