import type { ClientConfig } from '../config/schema';
import { computeDispatchDateIst, getShopStatus } from './calendar';
import { SOUTH_INDIA_STATE_CODES } from './constants';
import type { ErrorCode } from './errors';
import { computeLineGst } from './gst';
import { formatINR } from './money';
import type {
  BuyerType,
  CartLine,
  Coupon,
  FulfilmentMode,
  PriceTier,
  Product,
  Sku,
} from './schemas';

export interface QuoteInput {
  lines: CartLine[];
  buyerType: BuyerType;
  mode: FulfilmentMode;
  pincode?: string;
  stateCode?: string;
  couponCode?: string;
  gstin?: string;
  now: Date;
  config: ClientConfig;
  catalog: {
    products: Product[];
    skus: Sku[];
    tiers: PriceTier[];
    coupons: Coupon[];
  };
  sessionApprovedWholesale: boolean;
}

export interface QuotedLine {
  skuId: string;
  skuCode: string;
  productId: string;
  productSlug: string;
  name: string;
  packLabel: string;
  imageUrl: string | null;
  qty: number;
  unitPaise: number;
  mrpPaise: number;
  lineSubtotal: number;
  gstRate: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
  lineTotal: number;
  shipWeightG: number;
  hsnCode: string;
  note?: string;
}

export interface QuoteMessage {
  code: ErrorCode;
  message: string;
  lineId?: string;
}

export interface QuoteResponse {
  ok: boolean;
  lines: QuotedLine[];
  subtotal: number;
  shipping: number;
  shipWeightG: number;
  discount: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
  taxExtra: number;
  total: number;
  roundingNote: string;
  errors: QuoteMessage[];
  warnings: string[];
  dispatchBy: string;
  availableModes: Array<{ mode: FulfilmentMode; enabled: boolean; reason?: string }>;
  freeShippingThresholdPaise: number | null;
  amountToFreeShippingPaise: number | null;
  appliedCoupon: string | null;
  placeOfSupplyState: string;
  isInterState: boolean;
  pricesInclusive: boolean;
}

/**
 * Pure, deterministic quote engine (Section P3).
 * Exact rule order:
 * 1. Shop status
 * 2. SKU active
 * 3. Stock
 * 4. Max per order
 * 5. MOQ & tiers (wholesale only)
 * 6. Fulfilment mode validity
 * 7. Shipping (sum of shipWeightG × slab table by zone; free above threshold)
 * 8. Coupon (validity, min order, usage, one per order, percent cap, fixed clamp >= 0)
 * 9. GST (retail inclusive back-calculated; wholesale exclusive added; CGST+SGST vs IGST)
 * 10. Rounding at line level
 */
export function computeQuote(input: QuoteInput): QuoteResponse {
  const { config, catalog, now } = input;
  const errors: QuoteMessage[] = [];
  const warnings: string[] = [];

  const effectiveBuyer: BuyerType =
    input.buyerType === 'wholesale' && input.sessionApprovedWholesale && config.features.wholesale
      ? 'wholesale'
      : 'retail';
  const pricesInclusive = effectiveBuyer === 'retail';

  // 1. Shop status
  const shop = getShopStatus(config, now);
  if (config.maintenance) {
    errors.push({ code: 'SHOP_CLOSED', message: 'Store is under scheduled maintenance.' });
  } else if (shop.status === 'closed') {
    errors.push({ code: 'SHOP_CLOSED', message: shop.reason });
  } else if (shop.status === 'busy') {
    warnings.push(shop.reason);
  }

  // Merge duplicate SKU lines safely
  const merged = new Map<string, { qty: number; note?: string }>();
  for (const line of input.lines) {
    const existing = merged.get(line.skuId);
    merged.set(line.skuId, {
      qty: (existing?.qty || 0) + line.qty,
      note: line.note || existing?.note,
    });
  }

  if (merged.size === 0) {
    errors.push({ code: 'VALIDATION', message: 'Your cart is empty.' });
  }

  const productById = new Map(catalog.products.map((p) => [p.id, p]));
  const skuById = new Map(catalog.skus.map((s) => [s.id, s]));

  // Place of supply
  const trimmedGstin = input.gstin?.trim().toUpperCase();
  const placeOfSupplyState =
    trimmedGstin && trimmedGstin.length >= 2
      ? trimmedGstin.slice(0, 2)
      : input.stateCode || config.legal.stateCode;
  const isInterState = placeOfSupplyState !== config.legal.stateCode;

  interface WorkingLine {
    sku: Sku;
    product: Product;
    qty: number;
    unitPaise: number;
    grossBasis: number;
    note?: string;
  }

  const working: WorkingLine[] = [];
  let shipWeightG = 0;
  let preDiscountBasisSum = 0;

  for (const [skuId, entry] of merged.entries()) {
    const sku = skuById.get(skuId);
    const product = sku ? productById.get(sku.productId) : undefined;

    // 2. SKU active
    if (!sku || !product || sku.status !== 'active' || product.status !== 'active') {
      errors.push({
        code: 'OUT_OF_STOCK',
        message: `An item in your cart (${sku?.skuCode || skuId}) is no longer available.`,
        lineId: skuId,
      });
      continue;
    }

    // 3. Stock
    if (sku.stockQty < entry.qty) {
      errors.push({
        code: 'OUT_OF_STOCK',
        message:
          sku.stockQty === 0
            ? `${product.name} (${sku.packLabel}) is sold out.`
            : `Only ${sku.stockQty} packs of ${product.name} (${sku.packLabel}) left in stock.`,
        lineId: skuId,
      });
      continue;
    }

    // 4. Max per order (retail cap; wholesale uses higher cap)
    const maxCap = effectiveBuyer === 'wholesale' ? 500 : config.maxQtyPerOrder;
    if (entry.qty > maxCap) {
      errors.push({
        code: 'VALIDATION',
        message: `Maximum ${maxCap} packs per order for ${product.name} (${sku.packLabel}).`,
        lineId: skuId,
      });
      continue;
    }

    // 5. MOQ & tiers (wholesale only)
    let unitPaise = sku.retailPricePaise;
    if (effectiveBuyer === 'wholesale') {
      if (entry.qty < sku.wholesaleMoq) {
        errors.push({
          code: 'VALIDATION',
          message: `Wholesale minimum for ${product.name} (${sku.packLabel}) is ${sku.wholesaleMoq} packs.`,
          lineId: skuId,
        });
      }
      unitPaise = sku.wholesalePricePaise ?? sku.retailPricePaise;
      const tiers = catalog.tiers
        .filter((t) => t.skuId === sku.id)
        .sort((a, b) => b.minQty - a.minQty);
      for (const t of tiers) {
        if (entry.qty >= t.minQty) {
          unitPaise = t.pricePaise;
          break;
        }
      }
    }

    const grossBasis = unitPaise * entry.qty;
    preDiscountBasisSum += grossBasis;
    shipWeightG += sku.shipWeightG * entry.qty;
    working.push({ sku, product, qty: entry.qty, unitPaise, grossBasis, note: entry.note });
  }

  // 6. Fulfilment mode availability
  const cleanPincode = input.pincode?.trim();
  const hasValidPincode = Boolean(cleanPincode && /^\d{6}$/.test(cleanPincode));
  const localZone = hasValidPincode
    ? config.zones.find((z) => z.pincodes.includes(cleanPincode!))
    : undefined;

  const availableModes: QuoteResponse['availableModes'] = [
    {
      mode: 'local',
      enabled: config.features.local && config.fulfilment.localDelivery && Boolean(localZone),
      reason: !config.features.local || !config.fulfilment.localDelivery
        ? 'Local delivery is disabled'
        : !hasValidPincode
        ? 'Enter a 6-digit pincode to check local delivery'
        : !localZone
        ? `Pincode ${cleanPincode} is outside our local delivery zones`
        : undefined,
    },
    {
      mode: 'courier',
      enabled: config.features.courier && config.fulfilment.courier,
      reason: !config.features.courier || !config.fulfilment.courier ? 'Courier shipping disabled' : undefined,
    },
    {
      mode: 'pickup',
      enabled: config.features.pickup && config.fulfilment.pickup,
      reason: !config.features.pickup || !config.fulfilment.pickup ? 'Store pickup disabled' : undefined,
    },
  ];

  if (input.mode === 'local') {
    if (!config.features.local || !config.fulfilment.localDelivery) {
      errors.push({ code: 'NOT_SERVICEABLE', message: 'Local delivery is currently unavailable.' });
    } else if (!hasValidPincode) {
      errors.push({ code: 'VALIDATION', message: 'Enter a 6-digit pincode for local delivery.' });
    } else if (!localZone) {
      errors.push({
        code: 'NOT_SERVICEABLE',
        message: `We do not offer local delivery to ${cleanPincode} yet. Choose All-India courier or store pickup.`,
      });
    } else if (preDiscountBasisSum > 0 && preDiscountBasisSum < localZone.minOrderPaise) {
      errors.push({
        code: 'VALIDATION',
        message: `Minimum order for ${localZone.name} is ${formatINR(localZone.minOrderPaise)}.`,
      });
    }
  } else if (input.mode === 'courier') {
    if (!config.features.courier || !config.fulfilment.courier) {
      errors.push({ code: 'NOT_SERVICEABLE', message: 'All-India courier is currently unavailable.' });
    } else if (cleanPincode && !hasValidPincode) {
      errors.push({ code: 'VALIDATION', message: 'Pincode must be 6 digits.' });
    } else if (hasValidPincode && cleanPincode!.startsWith('0')) {
      errors.push({
        code: 'NOT_SERVICEABLE',
        message: `Pincode ${cleanPincode} is not serviceable by courier. Call us on ${config.contact.phone}.`,
      });
    }
  }

  // 8. Coupon check (evaluated against preDiscountBasisSum; discount clamped >= 0)
  let discount = 0;
  let appliedCoupon: string | null = null;
  const code = input.couponCode?.trim().toUpperCase();
  if (code) {
    if (!config.features.coupons) {
      errors.push({ code: 'COUPON_INVALID', message: 'Coupons are currently disabled.' });
    } else {
      const coupon = catalog.coupons.find((c) => c.code.toUpperCase() === code);
      const nowIso = now.toISOString();
      if (!coupon || !coupon.active) {
        errors.push({ code: 'COUPON_INVALID', message: `Coupon "${code}" is not valid.` });
      } else if (nowIso < coupon.validFromIso || nowIso > coupon.validToIso) {
        errors.push({ code: 'COUPON_INVALID', message: `Coupon "${code}" has expired.` });
      } else if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
        errors.push({ code: 'COUPON_INVALID', message: `Coupon "${code}" has reached its usage limit.` });
      } else if (preDiscountBasisSum < coupon.minOrderPaise) {
        errors.push({
          code: 'COUPON_INVALID',
          message: `Minimum order of ${formatINR(coupon.minOrderPaise)} required for ${coupon.code}.`,
        });
      } else {
        if (coupon.type === 'percent') {
          discount = Math.round((preDiscountBasisSum * coupon.value) / 100);
          if (coupon.maxDiscountPaise !== null) {
            discount = Math.min(discount, coupon.maxDiscountPaise);
          }
        } else {
          discount = Math.min(coupon.value, preDiscountBasisSum);
        }
        discount = Math.max(0, discount);
        appliedCoupon = coupon.code;
      }
    }
  }

  // 9 & 10. Proportional discount allocation + Line-level GST & rounding
  let allocatedDiscount = 0;
  let subtotal = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let tax = 0;
  let taxExtra = 0;

  const lines: QuotedLine[] = working.map((row, idx) => {
    const isLast = idx === working.length - 1;
    const lineDiscount =
      preDiscountBasisSum === 0
        ? 0
        : isLast
        ? discount - allocatedDiscount
        : Math.round((row.grossBasis / preDiscountBasisSum) * discount);
    allocatedDiscount += lineDiscount;

    const discountedBasis = Math.max(0, row.grossBasis - lineDiscount);
    const gst = computeLineGst({
      basisPaise: discountedBasis,
      gstRate: row.product.gstRate,
      inclusive: pricesInclusive,
      isInterState,
    });

    subtotal += row.grossBasis;
    cgst += gst.cgstPaise;
    sgst += gst.sgstPaise;
    igst += gst.igstPaise;
    tax += gst.taxPaise;
    if (!pricesInclusive) {
      taxExtra += gst.taxPaise;
    }

    return {
      skuId: row.sku.id,
      skuCode: row.sku.skuCode,
      productId: row.product.id,
      productSlug: row.product.slug,
      name: `${row.product.name} (${row.sku.packLabel})`,
      packLabel: row.sku.packLabel,
      imageUrl: row.product.imageUrl,
      qty: row.qty,
      unitPaise: row.unitPaise,
      mrpPaise: row.sku.mrpPaise,
      lineSubtotal: row.grossBasis,
      gstRate: row.product.gstRate,
      taxableValue: gst.taxablePaise,
      cgst: gst.cgstPaise,
      sgst: gst.sgstPaise,
      igst: gst.igstPaise,
      tax: gst.taxPaise,
      lineTotal: gst.lineTotalPaise,
      shipWeightG: row.sku.shipWeightG * row.qty,
      hsnCode: row.product.hsnCode,
      note: row.note,
    };
  });

  // 7. Shipping calculation & Free-delivery threshold
  let shipping = 0;
  let freeShippingThresholdPaise: number | null = null;
  const merchandiseAfterDiscount = Math.max(0, subtotal - discount + taxExtra);

  if (working.length > 0) {
    if (input.mode === 'local' && localZone) {
      freeShippingThresholdPaise = localZone.freeAbovePaise;
      shipping =
        localZone.freeAbovePaise !== null && merchandiseAfterDiscount >= localZone.freeAbovePaise
          ? 0
          : localZone.feePaise;
    } else if (input.mode === 'courier') {
      const zoneKey = SOUTH_INDIA_STATE_CODES.has(placeOfSupplyState) ? 'SOUTH' : 'REST_OF_INDIA';
      const slab =
        config.shippingRates.find(
          (r) =>
            (r.zoneCode === placeOfSupplyState || r.zoneCode === zoneKey) &&
            shipWeightG >= r.minWeightG &&
            shipWeightG <= r.maxWeightG
        ) ||
        config.shippingRates.find(
          (r) =>
            r.zoneCode === 'REST_OF_INDIA' &&
            shipWeightG >= r.minWeightG &&
            shipWeightG <= r.maxWeightG
        );

      if (!slab) {
        errors.push({
          code: 'NOT_SERVICEABLE',
          message: `Total weight (${(shipWeightG / 1000).toFixed(2)} kg) exceeds standard courier slabs. Request a wholesale quote.`,
        });
      } else {
        freeShippingThresholdPaise = slab.freeAbovePaise;
        shipping =
          slab.freeAbovePaise !== null && merchandiseAfterDiscount >= slab.freeAbovePaise
            ? 0
            : slab.feePaise;
      }
    }
  }

  const amountToFreeShippingPaise =
    freeShippingThresholdPaise !== null && merchandiseAfterDiscount < freeShippingThresholdPaise
      ? freeShippingThresholdPaise - merchandiseAfterDiscount
      : null;

  // Invariant: total = Σlines + shipping + taxExtra − discount, never negative
  const total = Math.max(0, subtotal + shipping + taxExtra - discount);

  return {
    ok: errors.length === 0 && lines.length > 0,
    lines,
    subtotal,
    shipping,
    shipWeightG,
    discount,
    cgst,
    sgst,
    igst,
    tax,
    taxExtra,
    total,
    roundingNote: 'GST rounded at line level to nearest integer paisa.',
    errors,
    warnings,
    dispatchBy: computeDispatchDateIst(now, config),
    availableModes,
    freeShippingThresholdPaise,
    amountToFreeShippingPaise,
    appliedCoupon,
    placeOfSupplyState,
    isInterState,
    pricesInclusive,
  };
}
