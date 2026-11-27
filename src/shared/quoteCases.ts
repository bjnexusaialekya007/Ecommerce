import { clientConfig } from '../config/client.config';
import { SEED_COUPONS, SEED_PRODUCTS, SEED_SKUS, SEED_TIERS } from '../api/mock/seed';
import { computeDispatchDateIst } from './calendar';
import { computeQuote } from './quote';
import { validateGSTIN } from './money';

export interface QuoteCaseResult {
  id: string;
  name: string;
  passed: boolean;
  detail: string;
}

const OPEN_NOW = new Date('2026-11-24T06:30:00.000Z'); // 12:00 PM IST (Tuesday, open)
const BASE_CATALOG = {
  products: SEED_PRODUCTS,
  skus: SEED_SKUS,
  tiers: SEED_TIERS,
  coupons: SEED_COUPONS,
};

export function runAllQuoteCases(): QuoteCaseResult[] {
  const results: QuoteCaseResult[] = [];
  const assertCase = (id: string, name: string, ok: boolean, detail: string) => {
    results.push({ id, name, passed: ok, detail });
  };

  // 1. Retail inclusive GST intra-state (Aloo Bhujia 200g = ₹95 = 9500 paise, 12% inclusive)
  {
    const q = computeQuote({
      lines: [{ skuId: 'sku-ab-200', qty: 1 }],
      buyerType: 'retail',
      mode: 'pickup',
      stateCode: '36',
      now: OPEN_NOW,
      config: clientConfig,
      catalog: BASE_CATALOG,
      sessionApprovedWholesale: false,
    });
    const ok = q.ok && q.total === 9500 && q.taxExtra === 0 && !q.isInterState && q.cgst + q.sgst === q.tax;
    assertCase('Q01', 'Retail intra-state inclusive GST', ok, `total=${q.total}, tax=${q.tax}, cgst=${q.cgst}, sgst=${q.sgst}`);
  }

  // 2. Retail inter-state IGST (stateCode 27 Maharashtra)
  {
    const q = computeQuote({
      lines: [{ skuId: 'sku-ab-200', qty: 1 }],
      buyerType: 'retail',
      mode: 'courier',
      pincode: '400001',
      stateCode: '27',
      now: OPEN_NOW,
      config: clientConfig,
      catalog: BASE_CATALOG,
      sessionApprovedWholesale: false,
    });
    const ok = q.ok && q.isInterState && q.igst === q.tax && q.cgst === 0 && q.sgst === 0;
    assertCase('Q02', 'Retail inter-state IGST', ok, `igst=${q.igst}, shipping=${q.shipping}, total=${q.total}`);
  }

  // 3. GSTIN overrides stateCode for place of supply
  {
    const q = computeQuote({
      lines: [{ skuId: 'sku-ab-200', qty: 1 }],
      buyerType: 'retail',
      mode: 'pickup',
      stateCode: '36',
      gstin: '27AABCU9603R1ZN',
      now: OPEN_NOW,
      config: clientConfig,
      catalog: BASE_CATALOG,
      sessionApprovedWholesale: false,
    });
    assertCase('Q03', 'GSTIN 27 overrides stateCode 36 -> IGST', q.placeOfSupplyState === '27' && q.isInterState, `pos=${q.placeOfSupplyState}`);
  }

  // 4. Multi-slab cart (5% Kara Boondi + 12% Aloo Bhujia)
  {
    const q = computeQuote({
      lines: [
        { skuId: 'sku-ab-200', qty: 1 },
        { skuId: 'sku-kb-200', qty: 1 },
      ],
      buyerType: 'retail',
      mode: 'pickup',
      now: OPEN_NOW,
      config: clientConfig,
      catalog: BASE_CATALOG,
      sessionApprovedWholesale: false,
    });
    const rates = new Set(q.lines.map((l) => l.gstRate));
    assertCase('Q04', 'Mixed 5% and 12% GST rates in one cart', q.ok && rates.has(5) && rates.has(12), `rates=${[...rates].join(',')}`);
  }

  // 5. Coupon NAMKEEN10 (10% above ₹399 capped at ₹150)
  {
    const q = computeQuote({
      lines: [{ skuId: 'sku-ab-1000', qty: 2 }], // ₹840
      buyerType: 'retail',
      mode: 'pickup',
      couponCode: 'namkeen10',
      now: OPEN_NOW,
      config: clientConfig,
      catalog: BASE_CATALOG,
      sessionApprovedWholesale: false,
    });
    assertCase('Q05', 'Percent coupon 10% below ₹150 cap', q.ok && q.discount === 8400 && q.total === 75600, `discount=${q.discount}, total=${q.total}`);
  }

  // 6. Coupon percent cap hit (₹150 = 15000p max discount)
  {
    const q = computeQuote({
      lines: [{ skuId: 'sku-ab-1000', qty: 5 }], // ₹2100
      buyerType: 'retail',
      mode: 'pickup',
      couponCode: 'NAMKEEN10',
      now: OPEN_NOW,
      config: clientConfig,
      catalog: BASE_CATALOG,
      sessionApprovedWholesale: false,
    });
    assertCase('Q06', 'Percent coupon max cap 15000p', q.ok && q.discount === 15000, `discount=${q.discount}`);
  }

  // 7. Coupon below minimum order rejected
  {
    const q = computeQuote({
      lines: [{ skuId: 'sku-ab-200', qty: 1 }], // ₹95 < ₹399
      buyerType: 'retail',
      mode: 'pickup',
      couponCode: 'NAMKEEN10',
      now: OPEN_NOW,
      config: clientConfig,
      catalog: BASE_CATALOG,
      sessionApprovedWholesale: false,
    });
    assertCase('Q07', 'Coupon below minOrder returns COUPON_INVALID', !q.ok && q.errors.some((e) => e.code === 'COUPON_INVALID'), q.errors.map((e) => e.message).join('; '));
  }

  // 8. Fixed coupon clamped >= 0
  {
    const bigFixed = {
      ...SEED_COUPONS[1],
      code: 'HUGE500',
      value: 50000,
      minOrderPaise: 1000,
    };
    const q = computeQuote({
      lines: [{ skuId: 'sku-ab-200', qty: 1 }],
      buyerType: 'retail',
      mode: 'pickup',
      couponCode: 'HUGE500',
      now: OPEN_NOW,
      config: clientConfig,
      catalog: { ...BASE_CATALOG, coupons: [...SEED_COUPONS, bigFixed] },
      sessionApprovedWholesale: false,
    });
    assertCase('Q08', 'Fixed discount never produces negative total', q.ok && q.total === 0 && q.discount === 9500, `total=${q.total}, discount=${q.discount}`);
  }

  // 9. Local zone free shipping threshold (Hyderabad 500012 free above ₹499)
  {
    const q = computeQuote({
      lines: [{ skuId: 'sku-ab-1000', qty: 2 }], // ₹840 >= ₹499
      buyerType: 'retail',
      mode: 'local',
      pincode: '500012',
      now: OPEN_NOW,
      config: clientConfig,
      catalog: BASE_CATALOG,
      sessionApprovedWholesale: false,
    });
    assertCase('Q09', 'Local zone free delivery above threshold', q.ok && q.shipping === 0, `shipping=${q.shipping}`);
  }

  // 10. Local zone pincode outside zones rejected
  {
    const q = computeQuote({
      lines: [{ skuId: 'sku-ab-200', qty: 2 }],
      buyerType: 'retail',
      mode: 'local',
      pincode: '400001',
      now: OPEN_NOW,
      config: clientConfig,
      catalog: BASE_CATALOG,
      sessionApprovedWholesale: false,
    });
    assertCase('Q10', 'Outside local pincode returns NOT_SERVICEABLE', !q.ok && q.errors.some((e) => e.code === 'NOT_SERVICEABLE'), q.errors.map((e) => e.code).join(','));
  }

  // 11. Courier weight slab fee (1 pack 230g to South India 560001)
  {
    const q = computeQuote({
      lines: [{ skuId: 'sku-ab-200', qty: 1 }],
      buyerType: 'retail',
      mode: 'courier',
      pincode: '560001',
      stateCode: '29',
      now: OPEN_NOW,
      config: clientConfig,
      catalog: BASE_CATALOG,
      sessionApprovedWholesale: false,
    });
    assertCase('Q11', 'Courier weight slab charged under threshold', q.ok && q.shipping > 0 && q.shipWeightG === 230, `ship=${q.shipping}, weight=${q.shipWeightG}`);
  }

  // 12. Courier unserviceable pincode 0xxxxx
  {
    const q = computeQuote({
      lines: [{ skuId: 'sku-ab-200', qty: 1 }],
      buyerType: 'retail',
      mode: 'courier',
      pincode: '011001',
      now: OPEN_NOW,
      config: clientConfig,
      catalog: BASE_CATALOG,
      sessionApprovedWholesale: false,
    });
    assertCase('Q12', 'Pincode 0xxxxx rejected with NOT_SERVICEABLE', !q.ok && q.errors.some((e) => e.code === 'NOT_SERVICEABLE'), q.errors.map((e) => e.code).join(','));
  }

  // 13. Unapproved session asking wholesale buyerType downgraded to retail pricing
  {
    const q = computeQuote({
      lines: [{ skuId: 'sku-ab-200', qty: 1 }],
      buyerType: 'wholesale',
      mode: 'pickup',
      now: OPEN_NOW,
      config: clientConfig,
      catalog: BASE_CATALOG,
      sessionApprovedWholesale: false,
    });
    assertCase('Q13', 'Unapproved user never gets wholesale price', q.ok && q.pricesInclusive && q.lines[0].unitPaise === 9500, `unit=${q.lines[0]?.unitPaise}`);
  }

  // 14. Approved wholesale buyer below MOQ rejected
  {
    const q = computeQuote({
      lines: [{ skuId: 'sku-ab-200', qty: 2 }], // MOQ = 10
      buyerType: 'wholesale',
      mode: 'pickup',
      now: OPEN_NOW,
      config: clientConfig,
      catalog: BASE_CATALOG,
      sessionApprovedWholesale: true,
    });
    assertCase('Q14', 'Wholesale below MOQ fails validation', !q.ok && q.errors.some((e) => e.code === 'VALIDATION'), q.errors.map((e) => e.message).join('; '));
  }

  // 15. Approved wholesale tier slab + exclusive GST added
  {
    const q = computeQuote({
      lines: [{ skuId: 'sku-ab-200', qty: 25 }], // Tier >=25 = 6300 paise
      buyerType: 'wholesale',
      mode: 'pickup',
      stateCode: '36',
      now: OPEN_NOW,
      config: clientConfig,
      catalog: BASE_CATALOG,
      sessionApprovedWholesale: true,
    });
    const ok = q.ok && !q.pricesInclusive && q.lines[0].unitPaise === 6300 && q.taxExtra > 0 && q.total === q.subtotal + q.taxExtra;
    assertCase('Q15', 'Wholesale tier 25+ price + exclusive GST', ok, `unit=${q.lines[0]?.unitPaise}, taxExtra=${q.taxExtra}, total=${q.total}`);
  }

  // 16. Sold out SKU rejected
  {
    const q = computeQuote({
      lines: [{ skuId: 'sku-kb-500', qty: 1 }], // stockQty = 0
      buyerType: 'retail',
      mode: 'pickup',
      now: OPEN_NOW,
      config: clientConfig,
      catalog: BASE_CATALOG,
      sessionApprovedWholesale: false,
    });
    assertCase('Q16', 'Zero stock SKU rejected', !q.ok && q.errors.some((e) => e.code === 'OUT_OF_STOCK'), q.errors.map((e) => e.message).join('; '));
  }

  // 17. Duplicate SKU lines merged and validated against stock/max
  {
    const q = computeQuote({
      lines: [
        { skuId: 'sku-km-500', qty: 3 },
        { skuId: 'sku-km-500', qty: 3 }, // stock = 4
      ],
      buyerType: 'retail',
      mode: 'pickup',
      now: OPEN_NOW,
      config: clientConfig,
      catalog: BASE_CATALOG,
      sessionApprovedWholesale: false,
    });
    assertCase('Q17', 'Duplicate SKU lines merged before stock check', !q.ok && q.errors.some((e) => e.code === 'OUT_OF_STOCK'), q.errors.map((e) => e.message).join('; '));
  }

  // 18. Retail maxQtyPerOrder enforced
  {
    const q = computeQuote({
      lines: [{ skuId: 'sku-ab-200', qty: clientConfig.maxQtyPerOrder + 1 }],
      buyerType: 'retail',
      mode: 'pickup',
      now: OPEN_NOW,
      config: clientConfig,
      catalog: BASE_CATALOG,
      sessionApprovedWholesale: false,
    });
    assertCase('Q18', 'Retail maxQtyPerOrder cap enforced', !q.ok && q.errors.some((e) => e.code === 'VALIDATION'), q.errors.map((e) => e.message).join('; '));
  }

  // 19. Manual shop closed blocks quote
  {
    const q = computeQuote({
      lines: [{ skuId: 'sku-ab-200', qty: 1 }],
      buyerType: 'retail',
      mode: 'pickup',
      now: OPEN_NOW,
      config: { ...clientConfig, shopStatusMode: 'manual', manualShopStatus: 'closed' },
      catalog: BASE_CATALOG,
      sessionApprovedWholesale: false,
    });
    assertCase('Q19', 'Shop closed blocks checkout quote', !q.ok && q.errors.some((e) => e.code === 'SHOP_CLOSED'), q.errors.map((e) => e.code).join(','));
  }

  // 20. Dispatch date skips weeklyOff (Sunday = 0) + holiday
  {
    const satEvening = new Date('2026-11-21T16:00:00.000Z'); // Sat 9:30 PM IST -> skips Sun -> Mon 2026-11-23
    const d = computeDispatchDateIst(satEvening, { ...clientConfig, dispatchDays: 1 });
    assertCase('Q20', 'IST dispatch skips closeTime & Sunday', d === '2026-11-23', `dispatchBy=${d}`);
  }

  // 21. GSTIN checksum validation passes known valid GSTIN & rejects corrupt digit
  {
    const valid = validateGSTIN('36AABCU9603R1ZO');
    const invalid = !validateGSTIN('36AABCU9603R1ZZ');
    assertCase('Q21', 'GSTIN checksum verification', valid && invalid, `valid=${valid}, invalidRejected=${invalid}`);
  }

  return results;
}
