# Changelog

## 1.0.0 — Packaged Namkeen Retail & Wholesale Storefront
- Implemented deterministic quote, GST (CGST+SGST / IGST), coupon, local zone, and all-India weight-slab shipping engine.
- Built mobile-first storefront (`/`, `/shop`, `/c/:slug`, `/p/:slug`, `/cart`, `/checkout`, `/order/:code`, `/track`, `/invoice/:code`).
- Built GSTIN-verified wholesale onboarding, OTP login, portal reorder, and bulk quote workflow.
- Built admin operations dashboard with live queue polling, legal status FSM transitions, AWB shipping, CSV dry-run import, and print modes.
- Added gated Three.js brass katori hero & GSAP ScrollTrigger story layer (`features.experience: true`, `features.pwa: false`).
- Added build-time SEO/GEO prerendering (`sitemap.xml`, `robots.txt`, `llms.txt`), consent-gated analytics, `/dev/*` inspectors, and Vitest test suite.
