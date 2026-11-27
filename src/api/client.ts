import type { ClientConfig } from '../config/schema';
import type {
  BuyerType,
  Category,
  Coupon,
  CreateOrderInput,
  Customer,
  FulfilmentMode,
  PriceTier,
  Product,
  Sku,
} from '../shared/schemas';
import type { NotificationMessage } from '../shared/providers';
import type { QuoteResponse } from '../shared/quote';
import type { OrderStatus } from '../shared/status';

export interface OrderRecord {
  id: string;
  publicCode: string;
  invoiceNo: string | null;
  invoiceToken: string;
  idempotencyKey: string;
  status: OrderStatus;
  paymentStatus: 'pending' | 'captured' | 'failed' | 'cod_pending' | 'refunded' | 'amount_mismatch';
  paymentMethod: 'razorpay' | 'cod';
  mode: FulfilmentMode;
  buyerType: BuyerType;
  customerName: string;
  phone: string;
  email: string;
  addressSummary: string;
  pincode: string;
  stateCode: string;
  gstin: string;
  businessName: string;
  placeOfSupplyState: string;
  isInterState: boolean;
  pricesInclusive: boolean;
  subtotal: number;
  discount: number;
  shipping: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
  total: number;
  shipWeightG: number;
  couponCode: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  courierName: string | null;
  trackingId: string | null;
  trackingUrl: string | null;
  dispatchBy: string;
  payBy: string;
  notes: string;
  amountMismatchFlag: boolean;
  emailFailedFlag: boolean;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    skuId: string;
    skuCode: string;
    name: string;
    packLabel: string;
    hsnCode: string;
    gstRate: number;
    qty: number;
    unitPaise: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    lineTotal: number;
  }>;
  paymentAttempts: Array<{ at: string; status: string; note: string }>;
  emailLog: NotificationMessage[];
}

export interface WholesaleQuoteRequest {
  id: string;
  name: string;
  phone: string;
  email: string;
  gstin: string;
  items: Array<{ skuId: string; skuCode: string; name: string; qty: number }>;
  message: string;
  status: 'new' | 'replied' | 'closed';
  replyNote: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  entity: string;
  summary: string;
  createdAt: string;
}

export interface PriceLogEntry {
  id: string;
  skuId: string;
  skuCode: string;
  oldRetailPaise: number;
  newRetailPaise: number;
  changedBy: string;
  changedAt: string;
}

export interface CatalogResponse {
  categories: Category[];
  products: Product[];
  skus: Sku[];
  tiers: PriceTier[];
  coupons: Coupon[];
}

export interface ApiClient {
  getCatalog(): Promise<CatalogResponse>;
  getProductBySlug(slug: string): Promise<{ product: Product; category: Category | null; skus: Sku[]; tiers: PriceTier[]; redirectedFrom?: string }>;
  getConfigPublic(): Promise<ClientConfig>;
  getShopStatus(): Promise<{ status: 'open' | 'busy' | 'closed'; reason: string; nextOpenText: string }>;
  quoteCart(payload: {
    lines: Array<{ skuId: string; qty: number; note?: string }>;
    mode: FulfilmentMode;
    pincode?: string;
    stateCode?: string;
    couponCode?: string;
    gstin?: string;
  }): Promise<QuoteResponse>;
  createOrder(payload: CreateOrderInput, idempotencyKey: string): Promise<OrderRecord>;
  getOrder(code: string, last4: string): Promise<OrderRecord>;
  getOrderByInvoiceToken(code: string, token: string): Promise<OrderRecord>;
  createRazorpayOrder(publicCode: string): Promise<{ razorpayOrderId: string; amountPaise: number }>;
  verifyRazorpayPayment(payload: {
    publicCode: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    simulateWebhook?: boolean;
  }): Promise<{ ok: boolean; order: OrderRecord }>;
  requestOtp(params: { email: string; role: 'admin' | 'wholesale' }): Promise<{ ok: boolean; devOtpHint: string }>;
  verifyOtp(params: { email: string; otp: string; role: 'admin' | 'wholesale' }): Promise<{ ok: boolean; email: string; buyer?: Customer }>;
  logout(role: 'admin' | 'wholesale'): Promise<void>;
  registerWholesale(input: {
    businessName: string;
    ownerName: string;
    gstin: string;
    phone: string;
    email: string;
    stateCode: string;
    address: string;
  }): Promise<Customer>;
  getWholesaleMe(): Promise<{ buyer: Customer | null; orders: OrderRecord[]; quotes: WholesaleQuoteRequest[] }>;
  submitQuoteRequest(input: {
    name: string;
    phone: string;
    email?: string;
    gstin?: string;
    items: Array<{ skuId: string; qty: number }>;
    message: string;
  }): Promise<WholesaleQuoteRequest>;

  // Admin
  adminGetOrders(statusFilter?: string): Promise<OrderRecord[]>;
  adminGetOrder(id: string): Promise<OrderRecord>;
  adminTransitionOrder(id: string, nextStatus: OrderStatus, reason?: string): Promise<OrderRecord>;
  adminMarkShipped(id: string, payload: { courierName: string; trackingId: string; trackingUrl?: string; weightG?: number }): Promise<OrderRecord>;
  adminResolveMismatch(id: string): Promise<OrderRecord>;
  adminRetryEmail(orderId: string): Promise<OrderRecord>;
  adminUpsertProduct(product: Partial<Product> & { id?: string }): Promise<Product>;
  adminUpsertSku(sku: Partial<Sku> & { id?: string; productId: string }): Promise<Sku>;
  adminCsvDryRun(rows: Array<Record<string, unknown>>): Promise<{ ok: boolean; errors: Array<{ row: number; error: string }>; validCount: number }>;
  adminCsvCommit(rows: Array<Record<string, unknown>>): Promise<{ imported: number }>;
  adminGetBuyers(): Promise<Customer[]>;
  adminApproveBuyer(id: string): Promise<Customer>;
  adminRejectBuyer(id: string, reason: string): Promise<Customer>;
  adminGetQuotes(): Promise<WholesaleQuoteRequest[]>;
  adminUpdateQuote(id: string, status: WholesaleQuoteRequest['status'], replyNote: string): Promise<WholesaleQuoteRequest>;
  adminUpdateShippingRates(rates: ClientConfig['shippingRates']): Promise<ClientConfig>;
  adminUpdateZones(zones: ClientConfig['zones']): Promise<ClientConfig>;
  adminUpsertCoupon(coupon: Coupon): Promise<Coupon[]>;
  adminUpdateSettings(patch: Partial<ClientConfig>): Promise<ClientConfig>;
  adminSetShopSwitch(status: 'open' | 'busy' | 'closed', busyMinutes?: number, note?: string): Promise<ClientConfig>;
  adminGetReports(): Promise<{
    todayOrders: number;
    todayRevenuePaise: number;
    sevenDayRevenuePaise: number;
    thirtyDayRevenuePaise: number;
    topSkus: Array<{ skuCode: string; name: string; qty: number; revenuePaise: number }>;
  }>;
  adminGetAudit(): Promise<{ audit: AuditLogEntry[]; priceLog: PriceLogEntry[] }>;
  adminExportAll(): Promise<string>;
}
