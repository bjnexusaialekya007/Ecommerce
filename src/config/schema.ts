import { z } from 'zod';

export const SocialLinkSchema = z.object({
  platform: z.enum(['instagram', 'facebook', 'youtube', 'x', 'linkedin', 'google', 'other']),
  url: z.string().url(),
  handle: z.string().optional(),
});

export const InstagramGridItemSchema = z.object({
  image: z.string().min(1),
  alt: z.string().min(3),
  postUrl: z.string().url(),
});

export const ZoneSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  pincodes: z.array(z.string().regex(/^\d{6}$/)),
  feePaise: z.number().int().nonnegative(),
  minOrderPaise: z.number().int().nonnegative(),
  freeAbovePaise: z.number().int().nonnegative().nullable(),
});

export const ShippingRateSlabSchema = z.object({
  id: z.string().min(1),
  zoneCode: z.string().min(1), // e.g. 'SOUTH', 'REST_OF_INDIA', or 2-digit state code
  zoneLabel: z.string().min(1),
  minWeightG: z.number().int().min(1),
  maxWeightG: z.number().int().min(1),
  feePaise: z.number().int().nonnegative(),
  freeAbovePaise: z.number().int().nonnegative().nullable(),
});

export const CourierSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  trackingUrlTemplate: z.string().min(1),
});

export const ClientConfigSchema = z.object({
  id: z.string().min(1),
  brand: z.object({
    name: z.string().min(2),
    shortName: z.string().min(2).max(16),
    tagline: z.string().min(4),
    logo: z.string().optional(),
  }),
  theme: z.object({
    bg: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    surface: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    surfaceLow: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    surface2: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    surfaceHigh: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    surfaceVariant: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    ink: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    inkMuted: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    primaryContainer: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    primaryHover: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    accentSoft: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    secondaryContainer: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    onSecondaryContainer: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    border: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    borderSoft: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  }),
  fonts: z.object({
    display: z.string().min(2),
    sans: z.string().min(2),
  }),
  contact: z.object({
    phone: z.string().min(6),
    email: z.string().email(),
    contactPerson: z.string().optional(),
    address: z.string().min(5),
    addressParts: z.object({
      line1: z.string().min(2),
      line2: z.string().optional(),
      area: z.string().min(2),
      city: z.string().min(2),
      state: z.string().min(2),
      pincode: z.string().regex(/^\d{6}$/),
      country: z.literal('IN'),
    }),
    mapUrl: z.string().url().optional(),
    lat: z.number(),
    lng: z.number(),
  }),
  whatsapp: z.object({
    enabled: z.boolean(),
    number: z.string().min(8),
    widget: z.object({
      enabled: z.boolean(),
      side: z.enum(['right', 'left']),
      nudge: z.boolean(),
    }),
    messages: z.object({
      general: z.string().min(1),
      cart: z.string().min(1),
      product: z.string().min(1),
      track: z.string().min(1),
      wholesale: z.string().min(1),
    }),
    catalogEnabled: z.boolean(),
    shortLink: z.string().url().optional(),
    replyTimeText: z.string().optional(),
  }),
  social: z.array(SocialLinkSchema),
  instagramGrid: z.array(InstagramGridItemSchema).max(6).optional(),
  legal: z.object({
    gstin: z.string().min(5),
    fssai: z.string().min(5),
    stateCode: z.string().length(2),
    legalName: z.string().min(2),
    manufacturerAddress: z.string().min(5),
    refundWindowHours: z.number().int().positive(),
    lastUpdated: z.string().min(4),
  }),
  hours: z.object({
    timezone: z.literal('Asia/Kolkata'),
    openTime: z.string().regex(/^\d{2}:\d{2}$/),
    closeTime: z.string().regex(/^\d{2}:\d{2}$/),
    displayText: z.string().min(3),
    weeklyOff: z.array(z.number().int().min(0).max(6)), // 0=Sunday
    holidays: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  }),
  maintenance: z.boolean(),
  shopStatusMode: z.enum(['auto', 'manual']),
  manualShopStatus: z.enum(['open', 'busy', 'closed']).default('open'),
  manualBusyMinutes: z.number().int().nonnegative().default(0),
  manualStatusNote: z.string().default(''),
  fulfilment: z.object({
    localDelivery: z.boolean(),
    courier: z.boolean(),
    pickup: z.boolean(),
  }),
  zones: z.array(ZoneSchema),
  shippingRates: z.array(ShippingRateSlabSchema),
  freeShippingAbovePaise: z.number().int().nonnegative().nullable(),
  dispatchDays: z.number().int().min(1).max(15),
  minOrderPaise: z.number().int().nonnegative(),
  maxQtyPerOrder: z.number().int().min(1).max(500),
  cod: z.boolean(),
  codMaxPaise: z.number().int().nonnegative(),
  payments: z.object({
    provider: z.enum(['razorpay', 'payu', 'cashfree', 'cod-only']),
  }),
  shipping: z.object({
    couriers: z.array(CourierSchema),
    trackingRequired: z.boolean(),
  }),
  wholesale: z.object({
    enabled: z.boolean(),
    approvalRequired: z.boolean(),
    showPricesTo: z.enum(['approved_only']),
    benefits: z.array(z.string()),
    defaultMoq: z.number().int().min(1),
  }),
  gstDisplay: z.object({
    retailInclusive: z.literal(true),
    wholesaleExclusive: z.literal(true),
    invoicePrefix: z.string().min(2).max(8),
  }),
  catalogMode: z.enum(['packaged', 'hot-food']),
  catalog: z.object({
    synonyms: z.record(z.string(), z.array(z.string())),
  }),
  copy: z.object({
    menuLabel: z.string().min(2),
    announcement: z.string(),
  }),
  reviews: z.array(
    z.object({
      author: z.string(),
      city: z.string(),
      text: z.string(),
      rating: z.number().int().min(1).max(5),
    })
  ),
  languages: z.array(z.enum(['en', 'te'])).min(1),
  features: z.object({
    pwa: z.boolean(),
    cod: z.boolean(),
    coupons: z.boolean(),
    wholesale: z.boolean(),
    courier: z.boolean(),
    pickup: z.boolean(),
    local: z.boolean(),
    analytics: z.boolean(),
    llmsTxt: z.boolean(),
    faq: z.boolean(),
    reviews: z.boolean(),
    experience: z.boolean(),
  }),
  experience: z.object({
    tier0: z.boolean().default(true),
    hero: z.enum(['3d', 'text', 'image']),
    heroModelUrl: z.string().optional(),
    posterUrl: z.string().min(1),
    story: z.boolean(),
    smoothScroll: z.literal(false),
    pauseControl: z.boolean(),
  }),
  seo: z.object({
    siteUrl: z.string().url(),
    titleTemplate: z.string().min(2),
    homeTitle: z.string().min(5),
    homeDescription: z.string().min(20),
    defaultOgImage: z.string().min(1),
    aiBots: z.enum(['allow-all', 'search-only', 'block-ai']),
    googleSiteVerification: z.string().optional(),
    sameAs: z.array(z.string().url()),
    faq: z.array(z.object({ q: z.string(), a: z.string() })),
  }),
  analytics: z.object({
    ga4Id: z.string(),
    consentRequired: z.literal(true),
  }),
  images: z.object({
    baseUrl: z.string(),
    widths: z.array(z.number().int().positive()),
  }),
  adminAllowlist: z.array(z.string().email()).min(1),
  courierTrackingTemplates: z.record(z.string(), z.string()),
});

export type ClientConfig = z.infer<typeof ClientConfigSchema>;
