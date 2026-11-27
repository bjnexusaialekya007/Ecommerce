import { z } from 'zod';
import { validateGSTIN, validateIndianPhone } from './money';

export const CategorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  sortOrder: z.number().int(),
  active: z.boolean(),
});
export type Category = z.infer<typeof CategorySchema>;

export const ProductFaqSchema = z.object({
  q: z.string(),
  a: z.string(),
});

export const ProductSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  slug: z.string(),
  slugHistory: z.array(z.string()).default([]),
  name: z.string(),
  description: z.string(),
  ingredients: z.string(),
  allergens: z.string(),
  veg: z.boolean(),
  hsnCode: z.string().regex(/^\d{4,8}$/),
  gstRate: z.number().int(),
  shelfLifeDays: z.number().int().positive(),
  storage: z.string(),
  bestseller: z.boolean().default(false),
  imageUrl: z.string().nullable(),
  altText: z.string(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  faq: z.array(ProductFaqSchema).default([]),
  synonyms: z.array(z.string()).default([]),
  searchKeywords: z.array(z.string()).default([]),
  status: z.enum(['draft', 'active', 'archived']),
  updatedAt: z.string(),
});
export type Product = z.infer<typeof ProductSchema>;

export const PriceTierSchema = z.object({
  id: z.string(),
  skuId: z.string(),
  minQty: z.number().int().min(1),
  pricePaise: z.number().int().positive(),
});
export type PriceTier = z.infer<typeof PriceTierSchema>;

export const SkuSchema = z.object({
  id: z.string(),
  productId: z.string(),
  skuCode: z.string().regex(/^[A-Z0-9-]+$/),
  packLabel: z.string(),
  netWeightG: z.number().int().positive(),
  shipWeightG: z.number().int().positive(),
  mrpPaise: z.number().int().positive(),
  retailPricePaise: z.number().int().positive(),
  wholesalePricePaise: z.number().int().positive().nullable().optional(),
  wholesaleMoq: z.number().int().min(1).default(10),
  stockQty: z.number().int().min(0),
  lowStockAt: z.number().int().min(0).default(10),
  status: z.enum(['draft', 'active', 'archived']),
  tiers: z.array(PriceTierSchema).optional(),
});
export type Sku = z.infer<typeof SkuSchema>;

export const BuyerTypeSchema = z.enum(['retail', 'wholesale']);
export type BuyerType = z.infer<typeof BuyerTypeSchema>;

export const WholesaleStatusSchema = z.enum(['pending', 'approved', 'rejected']);
export type WholesaleStatus = z.infer<typeof WholesaleStatusSchema>;

export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string().email(),
  buyerType: BuyerTypeSchema,
  businessName: z.string().optional(),
  gstin: z.string().optional(),
  stateCode: z.string().length(2),
  address: z.string().optional(),
  wholesaleStatus: WholesaleStatusSchema.optional(),
  rejectReason: z.string().optional(),
  createdAt: z.string(),
});
export type Customer = z.infer<typeof CustomerSchema>;

export const CouponSchema = z.object({
  code: z.string(),
  type: z.enum(['percent', 'fixed']),
  value: z.number().int().positive(),
  maxDiscountPaise: z.number().int().positive().nullable(),
  minOrderPaise: z.number().int().nonnegative(),
  validFromIso: z.string(),
  validToIso: z.string(),
  maxUses: z.number().int().positive().nullable(),
  usedCount: z.number().int().nonnegative(),
  active: z.boolean(),
});
export type Coupon = z.infer<typeof CouponSchema>;

export const CartLineSchema = z.object({
  skuId: z.string().min(1),
  qty: z.number().int().min(1).max(500),
  note: z.string().max(120).optional(),
});
export type CartLine = z.infer<typeof CartLineSchema>;

export const FulfilmentModeSchema = z.enum(['local', 'courier', 'pickup']);
export type FulfilmentMode = z.infer<typeof FulfilmentModeSchema>;

export const QuoteRequestSchema = z.object({
  lines: z.array(CartLineSchema),
  mode: FulfilmentModeSchema,
  pincode: z.string().optional(),
  stateCode: z.string().length(2).optional(),
  couponCode: z.string().optional(),
  gstin: z.string().optional(),
});

export const OrderAttributionSchema = z.object({
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  gclid: z.string().optional(),
});
export type OrderAttribution = z.infer<typeof OrderAttributionSchema>;

export const CreateOrderSchema = z.object({
  lines: z.array(CartLineSchema).min(1),
  mode: FulfilmentModeSchema,
  paymentMethod: z.enum(['razorpay', 'cod']),
  customerName: z.string().trim().min(2, 'Enter your full name').max(100),
  phone: z.string().trim().refine(validateIndianPhone, 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9'),
  email: z.string().trim().email('Enter a valid email address').optional().or(z.literal('')),
  addressLine1: z.string().trim().max(180).optional(),
  addressLine2: z.string().trim().max(180).optional(),
  landmark: z.string().trim().max(120).optional(),
  pincode: z.string().trim().optional(),
  stateCode: z.string().length(2),
  gstin: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || validateGSTIN(v), 'Enter a valid 15-character GSTIN'),
  businessName: z.string().trim().max(150).optional(),
  couponCode: z.string().trim().max(32).optional(),
  notes: z.string().trim().max(250).optional(),
  acceptTerms: z.literal(true, { message: 'Please accept Terms & Refund Policy' }),
  turnstileToken: z.string().min(1, 'Complete verification'),
  honeypot: z.string().max(0).optional(),
  attribution: OrderAttributionSchema.optional(),
});
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

export const WholesaleRegisterSchema = z.object({
  businessName: z.string().trim().min(2, 'Business name is required'),
  ownerName: z.string().trim().min(2, 'Contact person name is required'),
  gstin: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine(validateGSTIN, 'Invalid 15-character GSTIN checksum'),
  phone: z.string().trim().refine(validateIndianPhone, 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9'),
  email: z.string().trim().email('Valid email required'),
  stateCode: z.string().length(2),
  address: z.string().trim().min(8, 'Full business address required'),
});

export const CsvImportRowSchema = z.object({
  product_slug: z.string().trim().min(2),
  product_name: z.string().trim().min(2),
  category_slug: z.string().trim().min(2),
  veg: z.enum(['1', '0', 'true', 'false']),
  hsn_code: z.string().trim().regex(/^\d{4,8}$/),
  gst_rate: z.coerce.number().int().refine((n) => [0, 5, 12, 18, 28].includes(n), 'GST must be 0, 5, 12, 18 or 28'),
  shelf_life_days: z.coerce.number().int().min(1),
  ingredients: z.string().trim().min(2),
  sku_code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]+$/),
  pack_label: z.string().trim().min(1),
  net_weight_g: z.coerce.number().int().positive(),
  ship_weight_g: z.coerce.number().int().positive(),
  mrp_rupees: z.coerce.number().positive(),
  retail_rupees: z.coerce.number().positive(),
  wholesale_rupees: z.coerce.number().nonnegative().optional(),
  wholesale_moq: z.coerce.number().int().min(1).default(10),
  stock_qty: z.coerce.number().int().min(0),
  status: z.enum(['draft', 'active', 'archived']).default('active'),
});
