# Storefront Developer & Client Handoff

## Architecture Overview
- **Frontend**: React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + Zustand + React Router v7 + Zod.
- **White-Label Config**: Single source of truth in `src/config/client.config.ts` validated against `ClientConfigSchema`. Preview `?client=demo` uses `src/config/client.demo.config.ts`.
- **Pricing & GST Engine**: Pure integer-paise calculation in `src/shared/quote.ts` and `src/shared/gst.ts` (retail GST inclusive back-calculation, wholesale GST exclusive added, CGST+SGST intra-state vs IGST inter-state).
- **SEO & GEO**: Build-time prerendering via `scripts/prerender.ts` emitting static route HTML, `<dl>` + `<table>` Quick Facts blocks, `sitemap.xml`, `robots.txt`, and `llms.txt` without exposing wholesale prices.
- **3D & Motion Experience**: Lazy-loaded vanilla Three.js brass bowl hero scene (`src/experience/HeroScene.ts`) + GSAP ScrollTrigger story (`src/experience/Story.tsx`) strictly gated by `shouldLoadExperience` and adaptive FPS monitoring. PWA remains disabled (`features.pwa = false`).

## Connecting a Real Backend
All UI routes talk exclusively to `api` exported from `src/api/index.ts`. Swap `src/api/mock/handler.ts` with a real HTTP client implementing `ApiClient` (`src/api/client.ts`) backed by Cloudflare Workers + D1 + Razorpay webhooks.
