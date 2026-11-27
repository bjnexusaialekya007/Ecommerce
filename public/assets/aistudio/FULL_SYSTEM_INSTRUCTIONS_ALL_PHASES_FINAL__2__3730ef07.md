# PROJECT SYSTEM INSTRUCTIONS: FINAL (single file: rules + design craft + working rules + all build phases)
Version: FINAL, 25 Nov 2026. Paste this ENTIRE file into AI Studio System instructions. Then send START. If a reply is cut off send CONTINUE. After a break send RESUME.
AI Studio Build notes: this project is a FRONTEND-ONLY static Vite app. AI Studio's scaffold may include a Node/Express server, Gemini API wiring and a GEMINI_API_KEY secret; this project uses none of them. In P1 remove only the unused scaffold parts, log them in docs/progress.md, and keep `metadata.json`. Never generate UI for entering keys or secrets; list env names in `.env.example` only.
VERIFICATION REALITY: the person using AI Studio sees only the chat, the Code tab and the live preview; there may be no terminal. NEVER ask the person to run a command inside AI Studio. NEVER say a command or test passed unless you ran it and saw its output. Everything that must be checked in the preview is built as an in-app page under `/dev/*` (including `/dev/checks`, Section O9). Anything that needs a terminal (typecheck, lint, vitest, bundle budget, image script, Playwright) is written, listed in docs/progress.md as "not run: needs terminal or CI", and is executed later by the CI workflow after GitHub sync or locally.
This file already contains the rules of these skills, written out so you do not need to load anything: Karpathy guidelines (Section L), UI/UX Pro Max, Frontend Design, Impeccable, better-ui, better-typography, better-colors, WCAG 2.2 accessibility, mobile-native, Emil Kowalski motion craft, choreography, animation performance, the BJNEXUS house rules, the SEO and Core Web Vitals skills (all in Section K), and the Three.js, GSAP ScrollTrigger and web3d integration skills (Section M, the Experience layer).
You are the sole engineer. The user will send ONE message: START. When you receive it, build the entire frontend by executing Section B phases P1 to P9 in order (including P7B and then P7C between P7 and P8; P7C runs only when `config.features.experience` is true), without stopping to ask questions. Skip P6 (the PWA add-on is not bought; features.pwa stays false) but keep the code ready for it. Where Sections D, E, F, G, H, I and an earlier line disagree, D to I win. Sections J, K and L apply to EVERY phase. K refines A and J on craft, interaction and accessibility detail (it never changes token values in A4); where K and J or A disagree on that detail, K wins.

## EXECUTION PROTOCOL (mandatory)
0. Before P1, read Sections K and L completely. Start every phase with a plan of 3 to 6 lines, each ending in "verify: <how>" (Section L4). Keep an assumptions log in docs/progress.md; never stop to ask a question, choose the simplest reading of this file and log it.
1. Keep `docs/progress.md` updated after every phase: phase, status, files created, Accept results (pass/fail per line), deviations, known gaps. Create it in P1.
2. After each phase: run that phase's "Accept when" list yourself, fix every failure, then continue to the next phase automatically. Do not wait for the user.
3. If your reply is cut off, the user will send CONTINUE: carry on from the last file you wrote, same format. If the user sends RESUME, read docs/progress.md and continue from the first unfinished phase.
4. Never skip: the Section J UX checklist (J6) after each phase, /dev/sim, /dev/seo, /dev/outbox, the vitest suites, the SEO prerender, consent, docs. Never claim a check passed without verifying it. Be honest about anything the preview cannot verify.
5. Output per reply: full files only, grouped by path, no long explanations. At the end of each phase give a 5-line status.
6. When P9 is complete, print the FINAL REPORT: (a) final file tree, (b) install/run/build commands (`npm i`, `npm run dev`, `npm run build:seo`, `npm test`), (c) Accept results per phase, (d) known gaps and "client to confirm" items, (e) mock-to-real table, (f) dependency list with gz sizes. Then write exactly: "BUILD COMPLETE. Use Download (ZIP) or Export to GitHub to take the full project."

---

# SECTION A — SYSTEM INSTRUCTIONS (paste into AI Studio)

## A1. Project
Mobile-first, white-label ordering website that installs as a PWA. First client segment: **packaged snacks (namkeen), retail + wholesale, local delivery + all-India courier + store pickup.** Placeholder catalog only (5 products, 12 SKUs) — the real SKU list is not finalized, so NOTHING about the catalog is hard-coded; it all comes from data/config.
Audience: Indian shoppers on mid/low-end Android over 4G, owner on a cheap Android tablet/phone.
Tone: warm, trustworthy, simple, task-first. This is an ordering app, not a showcase site.

## A2. Stack (locked)
- Vite + React 19 + TypeScript (strict) + Tailwind CSS v4 (`@theme` tokens in `src/styles/tokens.css`)
- React Router (data router), Zustand (cart, UI), Zod (schemas shared FE/BE in `src/shared/`), react-hook-form + @hookform/resolvers/zod
- Motion library: package **`motion`** (`motion/react`) using **`LazyMotion` + `domAnimation` + `m.*`** components only (keeps motion JS ≤ 30 KB gz). No GSAP, Three.js or Lenis anywhere EXCEPT inside the lazy-loaded Experience layer (Section M, `src/experience/`, behind `config.features.experience`). Still banned everywhere: Lottie, Spline, React Three Fiber / drei, parallax libraries, particle libraries, video backgrounds.
- Icons: **lucide-react only** (stroke 1.75, 20/24 px). No emoji as icons anywhere.
- PWA: vite-plugin-pwa (Workbox) — configured in P6, **optional add-on, gated by `config.features.pwa` (default false)**. When false: no manifest link, no service worker registered, no install banner.
- Document head: use **React 19 native metadata hoisting** (`<title>`, `<meta>`, `<link>`, JSON-LD `<script>` rendered inside route components). No react-helmet.
- Tests: vitest. Dev-only inspector pages replace anything that cannot run in the AI Studio preview.
- Folder layout (maps 1:1 to the future monorepo):
```
src/
  shared/        zod schemas, types, money.ts, quote.ts (pure), gst.ts, constants   -> future /packages/shared
  api/           client.ts (interface), mock/ (in-memory DB + handlers)             -> swapped for real fetch later
  config/        client.config.ts (+ client.demo.config.ts), schema.ts
  styles/        tokens.css, base.css, print.css
  components/    ui/ (primitives), shop/, admin/, layout/
  routes/        customer/, admin/, dev/
  stores/        cart.ts, ui.ts, auth.ts
  i18n/          en.ts, te.ts (stub, falls back to en)
  seo/           render.ts (PURE: route+data -> head, jsonLd[], factsHtml), robots.ts, sitemap.ts, llms.ts   -> future /packages/shared, reused by the Worker
  analytics/     track.ts (no-op until consent + id), events.ts (typed), consent.ts
  dev/           sim store, outbox, inspectors (excluded from production build)
  emails/        templates (html + text) for order confirmation, shipped, cancelled, refunded, owner alert, wholesale approved/rejected, OTP
docs/            api-contract.md, data-model.md, handoff.md, audit.md (generated in P9)
public/          _headers, robots.txt (generated), favicon set, og-default.png
.env.example
```

## A3. Non-negotiable engineering rules
1. **Money = integer paise everywhere.** One `formatINR(paise)` → `₹1,23,456.50` using `Intl.NumberFormat('en-IN')`. No floats, no `toFixed` on money. UI shows ₹, docs/code comments may say Rs.
2. **Client never sends prices.** Cart stores only `{skuId, qty, note?}`. Every price/tax/shipping/discount/total comes from `POST /api/cart/quote` (mock = pure function in `shared/quote.ts`). Never compute a displayed total in a component.
3. **All business values come from `client.config.ts`** (brand, colours, fonts, phone, address, email, WhatsApp, GSTIN, FSSAI, hours, zones, shipping slabs, thresholds, feature flags). ONE phone/address/email used everywhere via config. App refuses to boot (full-screen error) if the config fails Zod.
4. **White-label proof:** ship `client.demo.config.ts` (different name/colours/fonts/phone); `?client=demo` swaps it at runtime with zero code change.
5. **Every async screen has 4 states:** loading (skeleton if > ~1 s, nothing under 100 ms), empty (with a CTA), error (human message + retry), success. No spinners-only screens.
6. **Wholesale price never reaches an unapproved user** — not in UI, not in the API response, not in the DOM. The mock API must enforce this server-side style (strip the field).
7. **Idempotent order creation:** `POST /api/orders` takes an `Idempotency-Key`; double-tap and retry produce exactly one order.
8. **Times:** store UTC, display/compute in IST (`Asia/Kolkata`). Never use the browser's local timezone for cutoffs/dispatch dates.
9. **No dead ends:** GPS denied → manual pincode; offline → offline page with Call button; sold out → "Notify" is NOT built (add-on), show "Sold out" + similar items.
10. **No invented content.** No fake reviews, ratings, "10,000+ customers", awards, testimonials. Reviews section renders only if `config.reviews.length > 0`. Placeholder images = neutral aspect-ratio boxes with the product name (no stock photos, no AI faces).
11. Storage: `localStorage` only for cart + checkout draft + language, always inside try/catch; app must work if storage throws.
12. Accessibility baseline: WCAG 2.2 AA, semantic landmarks, one `<h1>` per page, skip link, `:focus-visible` ring, 44×44 px tap targets, live regions (`aria-live="polite"`) for cart/order updates, no colour-only meaning (veg mark has a shape), all inputs have visible labels.
13. Viewport meta WITHOUT `user-scalable=no`. `lang="en-IN"`. `color-scheme: light` (dark mode explicitly disabled).
14. Output format when you answer: **full files only**, grouped by path. Then list 5 manual tests I should run. No long explanations.
15. **Facts in HTML, not only in JS.** Every public page's essential facts (name, pack sizes, prices, MRP, weight, ingredients, allergens, veg, shelf life, FSSAI, availability, shipping and return summary, business NAP) must exist as real text in the first HTML render (see Section F). JSON-LD must match visible text exactly (same retail price, same availability). **Wholesale prices never appear in HTML, JSON-LD, sitemap or any prerendered output.**
16. **No PII to analytics.** Never send name, phone, email, address, GSTIN or full pincode to GA or any third party. Analytics loads only after consent (Section G).
17. **No secrets in the frontend, ever.** Only `VITE_*` public values. No real Razorpay secret, no webhook secret, no API keys in code or comments.
18. **Feature flags** (`config.features`): pwa, cod, coupons, wholesale, courier, pickup, local, analytics, llmsTxt, faq, reviews, experience. A disabled feature renders nothing and registers no routes/links to it.
19. **Errors:** every route has an `errorElement`; unknown slugs render NotFound with `data-status="404"`; a global ErrorBoundary logs via `logError()` (console now, swappable) and shows a human message + retry + phone. Shared error codes in `shared/errors.ts` (OUT_OF_STOCK, PRICE_CHANGED, SHOP_CLOSED, NOT_SERVICEABLE, COUPON_INVALID, PAYMENT_PENDING, PAYMENT_FAILED, RATE_LIMITED, UNAUTHENTICATED, FORBIDDEN, VALIDATION, NOT_FOUND, SERVER) each with an i18n message and a recovery action.
20. **Dispatch dates use a working-day calendar**: `config.dispatchDays` counts working days in IST, skipping `config.weeklyOff` (e.g. Sunday) and `config.holidays[]`. Never plain +N days.
21. **Contact actions are one component** (`<ContactActions/>`: call `tel:`, WhatsApp built ONLY by `buildWhatsAppUrl()` from `config.whatsapp` (Section N4), email, Directions). Every contact link is tracked (Section G) and comes from config.
22. **Mock honesty:** anything mocked is listed in `docs/handoff.md` with its real replacement. No mock may silently look like production behaviour (e.g. the OTP code 123456 shows a visible DEV badge).
24. **Follow Section N** for every phone, WhatsApp, social, address and client-information surface: one config source, structured address, placeholder safety (`check:client`), the WhatsApp widget and social links.
23. **Follow Section J** for design direction, screen layouts, navigation, trust rules, copy and the UX acceptance checklist. Section J is part of the definition of done for every phase.

## A4. Design tokens (primitive → semantic). Put in `tokens.css` as CSS variables + Tailwind `@theme`. All values below are contrast-verified (WCAG AA).
Palette is the default theme "Warm Namkeen"; `client.config.ts → theme` overrides any semantic token.

| Token | Value | Use | Verified contrast |
|---|---|---|---|
| `--bg` | #FFF9F0 | page (≈60%) | ink 15.9:1 |
| `--surface` | #FFFFFF | cards, sheets | ink 16.7:1 |
| `--surface-2` | #F6ECDC | chips, input fill, zebra | muted 5.9:1 |
| `--ink` | #2B1A12 | text, cart bar bg (≈30%) | — |
| `--ink-muted` | #6B5648 | secondary text | 6.6:1 on bg |
| `--primary` | #A63A12 | CTA fill, links (≈10%) | white on it 6.5:1 |
| `--primary-hover` | #8C2F0D | CTA hover/pressed | 8.3:1 |
| `--accent` | #F2A900 | badges, highlights, NEVER text on light | ink on it 8.3:1 |
| `--success` | #1E7B3A | paid, in stock | white 5.3:1 |
| `--danger` | #B42318 | errors, sold out | white 6.6:1 |
| `--warn-bg` / `--warn-ink` | #FFF1CC / #7A4B00 | busy/closed banners | 6.6:1 |
| `--border` | #8A7767 | input/controls (UI ≥3:1) | 4.1:1 |
| `--border-soft` | #E7DAC6 | decorative dividers only | — |
| `--focus` | #1B5FD1 | 3 px focus ring, 2 px offset | 5.6:1 |
| `--veg` / `--nonveg` | #0F8A3C / #8B3A1A | FSSAI marks (shape + colour) | 4.5 / 7.7 |
Colour rule: 60% bg, 30% ink/surfaces, 10% primary. Accent appears at most once per screen region. No gradients on text, no rainbow CTAs, one primary button per view.

**Spacing:** 4/8 pt scale (4, 8, 12, 16, 24, 32, 48, 64). Page gutter 16 px mobile, 24 tablet, 32 desktop. Container max 1200 px.
**Radius:** sm 8 · md 12 · lg 16 · xl 24 · pill 999. Cards md, sheets xl (top corners), buttons md, chips pill.
**Shadow (static, never animated):** `--sh-1: 0 1px 2px rgb(43 26 18/.08)`; `--sh-2: 0 6px 20px rgb(43 26 18/.12)` (sheets, cart bar only).
**Z-index:** base 0 · sticky 10 · header 20 · cart-bar 30 · backdrop 40 · sheet 50 · toast 60 · modal 70.
**Breakpoints:** 375 (design base), 640, 768, 1024, 1280. Must work 320 → 1280, portrait + landscape, no horizontal scroll.
**Grid:** product grid 2 cols (<640), 3 (≥768), 4 (≥1024). Admin tables become stacked cards <768.

## A5. Typography
Max 2 families + Indian-script fallbacks. Token-driven so each client can swap.
| Role | Family | Weights | Notes |
|---|---|---|---|
| Display (H1, H2, hero, section titles ONLY) | **Fraunces** (variable; `opsz` auto, `SOFT` 50) | 600, 700 | warm, food-friendly serif; never for prices, buttons, UI, admin |
| UI / body / prices / admin | **DM Sans** | 400, 500, 700 | prices 700 with `font-variant-numeric: tabular-nums` |
| Telugu fallback | Noto Sans Telugu | 400, 700 | `:lang(te)` rule; line-height +0.1 |
| Devanagari fallback | Noto Sans Devanagari | 400, 700 | `:lang(hi)` |
Stack: `'DM Sans', 'Noto Sans Telugu', 'Noto Sans Devanagari', system-ui, sans-serif`; display: `'Fraunces', Georgia, serif`.
Scale (mobile → desktop via `clamp`): 12 caption · 14 small/UI label · **16 body (min input size, prevents iOS zoom)** · 18 lead · 20 h4 · 24 h3 · `clamp(28px,5vw,36px)` h2 · `clamp(34px,7vw,52px)` h1/hero.
Line-height: body 1.5, headings 1.15, UI labels 1.25. Letter-spacing: 0 body, −0.01em display ≥ 34 px, no ALL-CAPS labels (K3).
Measure 60–70 ch for paragraphs. `text-wrap: balance` on headings, `pretty` on paragraphs. `font-display: swap`. Prototype may load from Google Fonts; production = self-hosted Latin subset, preload ONE file (DM Sans 400).
Long product names: clamp to 2 lines with `line-clamp-2`, full name on the product page. Never truncate prices or MRP.

## A6. Iconography + marks
One icon set (lucide). Veg/non-veg marks follow FSSAI: green square-with-dot (veg) / brown triangle-in-square (non-veg) as inline SVG components `<VegMark/>`, size 16, `aria-label="Vegetarian"`. Status icons always paired with text.

## A7. Components to build (primitives first, in `components/ui`)
Button (primary/secondary/ghost/danger; sizes md 44 px, lg 52 px; loading state = inline spinner, label kept, width locked), IconButton (44 px hit area, `aria-label` required), Chip/Tab (single + scrollable row with scroll-snap), Card (product), BottomSheet (mobile) → Dialog (≥768), Stepper (qty − n +, 44 px each), CartBar (sticky bottom), Input / PhoneInput (+91, `inputmode="numeric"`, 10 digits, starts 6–9) / PincodeInput (6 digits) / Select / Textarea / Checkbox / Radio-card, Toast (with Undo), Skeleton, EmptyState (icon + sentence + CTA, no illustrations), ErrorState, Badge (Bestseller / Sold out / Low stock / Wholesale), StatusPill, Banner (shop closed / busy / offline / update available), Timeline (order status), Accordion, Table → CardList (responsive), PriceBlock (price, MRP strike, "You save ₹X", "incl. taxes"), SkuChips (pack size selector), QtyTierTable (approved wholesale only).

## A8. Copy rules
Verb-first buttons: "Add to cart", "Place order", **"Pay ₹459"** (exact amount), "Track order", "Request quote". Errors say what happened + how to recover ("Pincode not found. Check it or call us on <phone>"). Empty states always have a CTA. Free-delivery terms in plain words ("Free delivery on orders above ₹499 within <zone>") — never a bare asterisk. Prices: "incl. taxes" for retail; wholesale "excl. GST, GST added at checkout". All strings via `t()` from `i18n/en.ts` (te.ts stubbed, falls back to en, marked `// TODO translate`).

## A9. Motion spec (single source; all prompts obey)
- Tokens: `--dur-instant:100ms; --dur-fast:160ms; --dur-base:240ms; --dur-slow:360ms; --ease-out:cubic-bezier(.22,1,.36,1); --ease-in-out:cubic-bezier(.77,0,.175,1)` (the last one only for movement of an element that stays on screen). **There is no ease-in token: never use ease-in on UI.** Export the same as `motion.ts` constants. **No ad-hoc durations.**
- Animate **only `transform` and `opacity`**. Never width/height/top/left/box-shadow/filter-blur in transitions or keyframes. `will-change` only while animating.
- Enter and exit both use ease-out (never ease-in on UI); exit is ~20% shorter than enter. Entrances start from opacity 0 and scale .95 (never scale(0)). Everything interruptible; no animation blocks input.
- Springs ONLY for bottom sheet and qty stepper: sheet `{type:'spring', stiffness:380, damping:34, mass:1}`; stepper `{type:'spring', stiffness:520, damping:30}`.
- Stagger 40–60 ms, **max 8 items, first paint only**. One hero moment per page. Admin = near-zero motion.
- Reduced motion: wrap app in `<MotionConfig reducedMotion="user">` AND add `@media (prefers-reduced-motion: reduce)` CSS that kills transitions except opacity; no springs, no parallax, no autoplay.
- Haptics: `navigator.vibrate?.(10)` on add-to-cart and order placed, feature-detected, skipped under reduced motion.
- Budget: motion JS ≤ 30 KB gz; 60 fps on mid-range Android.
Per-element spec (used in P7): see P7.

## A10. Anti-slop (hard NO list)
Gradient text; glassmorphism cards everywhere; blurred blobs; rainbow/multi-colour CTAs; emoji icons; cartoon empty-state art; centered-everything hero with floating shapes; "Trusted by 10,000+" style claims; bounce/elastic easing; shake-on-error; parallax; autoplay video; carousel as the only way to reach content; icon-in-coloured-circle repeated 3× as a feature row; lorem ipsum; "Welcome to…" headlines; box-shadow animation. Plus every ban in K3.


---

# SECTION B — BUILD PHASES P1 to P9 plus P7B and P7C (execute automatically in order when the user says START; skip P6 because config.features.pwa=false)

## P1 — Foundation, design system, mock API, config (plan S1 + S2)
```
Build the project foundation per the system instructions. Do not build customer or admin screens yet.

1. Scaffold the folder layout from A2. TypeScript strict. React Router data router with the full route map below (every route renders a titled placeholder with the correct layout shell for now).
2. tokens.css + Tailwind @theme from A4/A5/A9. base.css: reset, focus-visible ring, skip link, tap-highlight off, touch-action: manipulation, 100dvh helpers, safe-area insets, overscroll-behavior in sheets, hover styles only inside @media (hover:hover) and (pointer:fine), button user-select none, color-scheme: light, plus the full mobile baseline in K4 (viewport-fit=cover, interactive-widget, theme-color, text-size-adjust, scroll-padding for the sticky header and cart bar, themed ::selection / caret / scrollbar / accent-color).
3. client.config.ts + Zod schema (src/config/schema.ts): brand{name,shortName,tagline,logo}, theme overrides, fonts, contact{phone,email,contactPerson?,address,addressParts{line1,line2?,area,city,state,pincode,country:'IN'},mapUrl,lat,lng}, whatsapp{enabled,number,widget{enabled,side:'right'|'left',nudge},messages{general,cart,product,track,wholesale},catalogEnabled,shortLink?,replyTimeText?}, social[{platform:'instagram'|'facebook'|'youtube'|'x'|'linkedin'|'google'|'other',url,handle?}], instagramGrid[{image,alt,postUrl}]? (max 6), legal{gstin,fssai,stateCode,legalName,manufacturerAddress}, hours + weeklyOff + holidays[], maintenance(boolean), shopStatusMode(auto|manual), fulfilment{localDelivery,courier,pickup flags}, zones[], shippingRates[], freeShippingAbovePaise, dispatchDays(working days), minOrderPaise, cod flag, wholesale{enabled,approvalRequired,showPricesTo}, gstDisplay{retailInclusive:true, wholesaleExclusive:true}, catalogMode('packaged'|'hot-food'), reviews[], social[], languages, **features{pwa,cod,coupons,wholesale,courier,pickup,local,analytics,llmsTxt,faq,reviews,experience}, experience{hero:'3d'|'text'|'image', heroModelUrl?, posterUrl, story:boolean, smoothScroll:false, pauseControl:true}, seo{siteUrl,titleTemplate,homeTitle,homeDescription,defaultOgImage,aiBots:'allow-all'|'search-only'|'block-ai',googleSiteVerification,sameAs[],faq[{q,a}]}, analytics{ga4Id,consentRequired:true}, images{baseUrl,widths:[320,640,960,1280]}, adminAllowlist[], courierTrackingTemplates{courierName:urlWithTrackingIdPlaceholder}**. Boot error screen on invalid config. client.demo.config.ts as a second brand; ?client=demo swaps it.
4. src/shared: schemas + types for Category, Product, Sku, PriceTier, Customer(buyerType), ShippingRate, Zone, Coupon, CartLine, QuoteRequest, QuoteResponse, Order, OrderItem(snapshots), Payment. money.ts (formatINR, paise helpers, no floats). gst.ts (split inclusive/exclusive; CGST+SGST same state, IGST other state; round at line level, document the rule in a comment). status.ts: order state machine with legal transitions: pending_payment→paid→packed→shipped→delivered, plus cancelled, expired, refunded; local mode labels "Out for delivery", pickup "Ready for pickup"; illegal transitions throw.
5. src/api: `ApiClient` interface exposing exactly these endpoints (typed with the shared schemas): GET /api/catalog, GET /api/products/:slug, GET /api/config/public, GET /api/shop-status, POST /api/cart/quote, POST /api/orders (Idempotency-Key), GET /api/orders/:code?last4=, POST /api/payments/razorpay/order (mock), POST /api/payments/razorpay/verify (mock), POST /api/auth/otp, POST /api/auth/verify, wholesale: POST /api/wholesale/register, GET /api/wholesale/me, POST /api/wholesale/quote-requests; admin: orders list/detail/transition/mark-shipped, products+skus CRUD, CSV import dry-run/commit/export, buyers approve/reject, shipping rates, zones, coupons, settings, reports, shop switch. Mock implementation: in-memory DB seeded with 4 categories, 5 products, 12 SKUs (placeholder namkeen: Aloo Bhujia, Ratlam Sev, Mixture, Kara Boondi, Murukku; packs 200 g / 500 g / 1 kg; MRP, retail, wholesale prices, MOQ, tiers, GST 12%/5% mixed, HSN, shelf life, ingredients, allergens), 3 shipping zones with weight slabs, 2 local pincodes zones, 2 coupons, 1 approved + 1 pending wholesale buyer. Latency 150–400 ms random; a dev toggle (?fail=1) makes calls fail 30% to test error states. Wholesale prices are stripped from responses unless the session is an approved wholesale buyer.
6. Dev route /dev/styleguide: renders every token (colour swatches with contrast ratio, type scale incl. Telugu sample line, spacing, radius, shadow), and every primitive in A7 in all states (default, hover, focus, disabled, loading, error). This page is the exit check.
7. Layout shells: CustomerLayout (header with logo/search/cart, announcement bar slot, bottom nav on <768: Home, Shop, Cart, Track, More; footer with FSSAI, contact from config, policy links, language switch) and AdminLayout (sidebar ≥1024, top bar + drawer below). Admin has noindex meta.
8. **Guards + error handling (Section E):** implement `requireAdmin`, `requireBuyer`, `guestOnly`, `cartNotEmpty`, `devOnly` as route loaders; `next=` param on login redirects; `errorElement` on every route; global ErrorBoundary; NotFound with `data-status="404"`; maintenance mode switch; reserved error codes from A3.19.
9. **Boundary simulator `/dev/sim`** and **`/dev/outbox`** (Section H1): build the `devSim` store NOW and make the mock API read it, so every later prompt can be tested against failures. Mock reservations: stock is reserved at order creation for 15 minutes and released by a mock cron (setInterval) if unpaid.
10. **Skeletons only (no real logic yet) for:** `src/seo/render.ts` (types + function signatures), `src/analytics/track.ts` (typed no-op), `src/analytics/consent.ts`, `ImageSlot` component (srcset from config.images, fixed aspect ratio, fallback box with product name), `ContactActions`, `logError`. Filled in by P2, P3 and P8.
11. `.env.example` (Section I2), `public/_headers` (Section I3), `public/robots.txt` placeholder, favicon set + og-default placeholder generated from brand initials.
12. **Design plan (Section K1):** write `docs/design-plan.md` (surface modes, type roles, ASCII wireframes for home, product and checkout, alignment rules, the one memorable detail, and the generic-defaults review with what you changed). Colour token values stay as in A4.
13. Add the assumptions log section to `docs/progress.md` (Section L1).
15. **Client data (Section N):** extend the Zod schema as above; write pure `shared/whatsapp.ts` (`buildWhatsAppUrl`, `normalizeWaNumber`) and `shared/address.ts` (`formatAddress`) with vitest cases; write `scripts/check-client.ts` and the npm script `check:client` (N1); mark every placeholder value in `client.demo.config.ts` exactly as N1 says.
16. **Master-repo seams (Section O):** provider interfaces in `src/shared/providers.ts` (`PaymentProvider`, `CourierProvider`, `NotificationProvider`) with the mock implementations; npm scripts `typecheck`, `lint`, `test`, `check:client`, `check:boundaries`, `check:budget`, `build`; `.github/workflows/ci.yml`; `CHANGELOG.md` starting at `1.0.0`; the `/dev/checks` page (Section O9).
14. `metadata.json`: keep it; add `requestFramePermissions: ["geolocation"]` only when the GPS pincode lookup is built (P2/P3), so the preview can ask for location. No other permissions.


ROUTE MAP (Section E is authoritative; implement guards and indexing exactly as listed there)
Customer: / · /shop · /c/:slug · /p/:slug · /cart · /checkout · /order/:code · /track · /invoice/:code · /wholesale · /wholesale/register · /wholesale/login · /wholesale/quote · /account · /about · /contact · /faq · /policies/privacy · /policies/terms · /policies/refund · /policies/shipping · /offline · /busy · /maintenance · *
Admin: /admin/login · /admin · /admin/orders · /admin/orders/:id · /admin/products · /admin/products/:id · /admin/import · /admin/wholesale/buyers · /admin/wholesale/quotes · /admin/shipping · /admin/zones · /admin/coupons · /admin/reports · /admin/audit · /admin/settings · /admin/backup
Dev (dev-only, stripped from production): /dev/styleguide · /dev/sim · /dev/outbox · /dev/seo · /dev/analytics · /dev/quote-cases · /dev/experience (only when features.experience) · /dev/checks
Machine files: /robots.txt · /sitemap.xml · /llms.txt · /manifest.webmanifest · /.well-known/assetlinks.json

Output: full files only. Then 5 tests.
```
**Accept when:** `docs/design-plan.md` exists with the generic-defaults review filled in; `/dev/checks` shows the client-config check (demo placeholders as warnings, plus a Strict toggle that shows what would fail) and the in-page cases for `buildWhatsAppUrl`, `formatAddress`, `getShopStatus` and `isPlaceholder` all pass; the npm scripts `typecheck`, `lint`, `test`, `check:client`, `check:boundaries` and `check:budget` exist and are listed as "not run: needs terminal or CI" unless you actually ran them; guards work (logged-out `/admin/orders` redirects to `/admin/login?next=...`; empty cart `/checkout` redirects to `/cart`; `/dev/*` hidden when VITE_ENABLE_DEV=0); `/dev/sim` toggles change mock behaviour; `/dev/outbox` shows a mock email when an OTP is requested; maintenance flag shows /maintenance on customer routes but not admin; unknown URL and unknown product slug show 404 UI; styleguide renders all tokens + primitives; contrast table shows all AA pass; `?client=demo` rebrands colours, fonts, name, phone with zero code change; invalid config shows boot error; every route resolves (no blank screens); `?fail=1` produces visible error states.

## P2 — Customer catalog: home, shop, product page (plan S3, Part J3/J5)
```
Build the customer browsing experience using the foundation. Follow the layouts in Section J2 and J3 and the design direction in J1. No cart logic yet beyond opening the product sheet/page.

HOME (/) — order of sections, all content from config/data:
1. Announcement bar (shop status + free-shipping threshold, dismissible per session).
2. Hero: ONE strong image slot (placeholder box), H1 from config.brand.tagline in Fraunces, one-line sub, primary CTA "Shop now", secondary text link "Wholesale enquiries". Left-aligned on desktop, image right; stacked on mobile. fetchpriority=high on hero image. No video, no floating shapes.
3. Category tiles (from data, 2×2 mobile / 4 desktop): name + item count, whole tile is the link.
4. Best sellers: horizontal scroll-snap row on mobile, 4-col grid on desktop; product cards.
5. How ordering works: 3 steps with lucide icons (Choose pack, Pay securely, We ship/deliver) — copy from i18n, no icon-in-circle repetition: use a numbered list with a small icon beside text.
6. Delivery & shipping: local pincode zones + "Ships across India" + free-shipping rule, all from config.
7. Wholesale banner (only if config.wholesale.enabled): "Buying for a shop? Register for wholesale pricing."
8. Reviews: render ONLY if config.reviews has entries; otherwise omit the section entirely.
9. Contact + map link + hours (from config), then footer. Footer and the contact block use `formatAddress()` and `<SocialLinks/>` (Section N2, N3); the optional "From our Instagram" grid renders only with ≥ 3 `instagramGrid` items.

SEARCH SYNONYMS (Section O6): the search index also matches `config.catalog.synonyms` (client-supplied alternate names and spellings, for example Telugu, Hindi and English names of the same item).
SHOP (/shop): sticky category chips (scroll-snap, active chip underline), search (client-side filter over loaded catalog, debounced 150 ms, highlight match), filters in a bottom sheet on mobile: veg-only toggle, pack size, price range, sort (popular, price low→high, high→low). Active-filter chips with clear-all. Result count in a live region. Product card: image 4:5 (width/height set, lazy), name (2 lines), VegMark, PackChips or "from ₹X", PriceBlock (price, MRP strike, % off only if MRP > price), Add button → if multi-SKU opens the pack sheet, if single-SKU adds directly with Stepper replacing the button. Sold-out: greyed image, "Sold out" Badge, no Add. Skeletons match card layout exactly (no CLS).

PRODUCT PAGE (/p/:slug): gallery (swipe on mobile, thumbnails desktop; image alt text), H1 in Fraunces, VegMark, SkuChips (pack size) that update price/MRP/weight/best-before live, PriceBlock, "Delivery check": pincode input → shows local delivery / India courier / not serviceable with estimated dispatch (uses mock quote), qty Stepper (respects max per order and stock), tabs/accordion: Description, Ingredients, Allergens, Storage & shelf life, Legal info block (MRP, net quantity, best before/shelf life, FSSAI no., manufacturer address, veg mark — Legal Metrology). If the user is an approved wholesale buyer: QtyTierTable + MOQ note; otherwise show a quiet link "Wholesale pricing for registered shops". Mobile: sticky bottom add bar with price + "Add ₹X". Related products (same category, max 4). JSON-LD Product+Offer injected via a <Seo> component (full SEO pass in P8).

CATEGORY PAGE (/c/:slug): H1 (category name), 2–3 sentence factual intro (from category.description, editable in admin), breadcrumb (Home > Category), product grid, link to /shop. `/shop?cat=x` redirects to `/c/x` (preserve other params).
PRODUCT PAGE ADDITIONS: breadcrumb (Home > Category > Product, with BreadcrumbList JSON-LD); a plain **"Quick facts"** block rendered as a semantic `<dl>` AND a pack/price `<table>` (caption, th scope) listing every pack: size, net weight, MRP, retail price, availability; Ingredients, Allergens, Veg, Shelf life, Storage, FSSAI, Manufacturer, Delivery summary (local pincodes, India courier, dispatch days), Returns summary, Wholesale note ("Available to registered shops. Prices shown after approval."). A short "Common questions" accordion (shelf life, veg or not, how long delivery takes, how to buy in bulk) generated from data plus `product.faq[]`. All of this is real DOM text at first render, not loaded after interaction.
SEO WIRING NOW (full pass in P8): every page renders `<Seo route data/>` which calls `seo/render.ts` (implement the pure function for home, shop, category, product, about, contact, faq now). Title/description from `product.seoTitle/seoDescription` with fallbacks (see Section F3). Canonical per Section E. Query-param variants get `noindex,follow`.
IMAGES: use `ImageSlot` everywhere (width/height set, srcset from config.images.widths, `sizes` attribute correct per layout, `loading=lazy` except the hero/first product image, `decoding=async`, meaningful `alt` from product.altText fallback "{name} {pack}"). File names in data: `{slug}-{pack}.webp`.
ANALYTICS CALLS (typed no-ops until P8): view_item_list, select_item, view_item, search, click_contact, pincode_check.
Quality: image skeleton + fade-in on load with fixed aspect ratio; broken image → neutral fallback box with product name; keyboard + screen reader can pick a pack and add an item; focus returns to trigger when sheet closes.
Output: full files only. Then 5 tests.
```
**Accept when:** `/c/:slug` and `/p/:slug` show breadcrumbs and Quick facts as real DOM text (view-source of the prerender/`/dev/seo` shows them); `/shop?cat=namkeen` redirects to `/c/namkeen`; unknown slug shows 404 UI with similar products; catalog loads from mock API on throttled Fast 3G with no layout shift; filters/search work and are URL-driven (shareable); pack chip changes price/weight; unapproved user never sees wholesale price in DOM (inspect + network); keyboard-only add works.

## P3 — Cart, quote engine, checkout, payment mock, order status (plan S4–S7, Part J2)
```
Build cart, quote, checkout and order tracking. Follow Section J2 (cart, checkout, order status) and J4 trust rules and J5 copy.

CART STORE (Zustand, persisted in try/catch localStorage): lines {skuId, qty, note?} only. On app open and on cart page mount: revalidate via POST /api/cart/quote; remove unavailable/archived SKUs with a toast + banner ("2 items were removed"); show "Price updated" chip on changed lines. Remove = Undo toast (5 s). Max per order and MOQ (wholesale) enforced with inline messages.

QUOTE ENGINE — src/shared/quote.ts, PURE function (no fetch, no Date.now: pass `now`):
 input {lines, buyerType, mode: 'local'|'courier'|'pickup', pincode?, stateCode?, coupon?, now, config, catalog, session}
 output {lines[{skuId,name,qty,unitPaise,lineSubtotal,gstRate,tax}], subtotal, shipping, shipWeightG, discount, cgst, sgst, igst, tax, total, roundingNote, errors[{code,message,lineId?}], warnings[], dispatchBy(date IST), availableModes[]}
 Rule order (exactly): shop status → SKU active → stock → max per order → MOQ & tiers (wholesale only) → fulfilment mode validity (local needs pincode in zone; courier needs serviceable pincode/state; pickup always) → shipping (sum of ship_weight × slab table by state/zone; free above threshold, stated plainly) → coupon (validity, min order, usage, one per order, percent cap, fixed clamp ≥ 0) → GST (retail inclusive back-calculated; wholesale exclusive added; CGST+SGST if same state as config.legal.stateCode else IGST) → rounding at line level.
 Invariant: total = Σlines + shipping + taxExtra − discount, never negative. Write src/shared/quote.test.ts (vitest) with these cases: empty cart; single item; max per order; MOQ−1 / MOQ; tier boundary; inclusive vs exclusive tax; mixed GST rates; same-state vs other-state (CGST+SGST vs IGST); weight slab 499 g / 500 g / 501 g; free-shipping exactly at threshold; min order below/above; pincode hit/miss; coupon expired / min not met / max uses / double use / percent cap / fixed > subtotal; stock equals qty / one short; archived SKU in cart; shop closed; duplicate lines merge; unicode in note. Also expose /dev/quote-cases page that runs them in-browser and shows pass/fail (in case tests can't run in the preview).

CART PAGE (/cart): lines with image, name, pack, unit price, Stepper, remove; live total weight; shipping estimate by pincode (inline input, remembers last); coupon field (apply/remove, clear error text); totals box: Subtotal, Shipping, Discount, GST (retail: "incl. ₹X GST"; wholesale: separate CGST/SGST or IGST rows), Total; "incl. taxes" wording; sticky checkout bar on mobile with total; empty state "Your cart is empty" + CTA "Shop now". Shop closed/busy banner disables checkout with the reason.

CHECKOUT (/checkout) — one page, three collapsible steps on mobile (Contact → Delivery → Review & pay), side-by-side summary on desktop:
 Contact: name, phone (PhoneInput, numeric keypad, 16 px), email (optional unless config says required); guest only. Wholesale buyers also see GSTIN (15 chars + checksum validation + state-code match) and business name, prefilled from account.
 Delivery: radio-cards for enabled modes: Local delivery / India courier / Store pickup (with the plain reason when a mode is unavailable). Address fields (line 1/2, landmark, pincode → auto city/state from mock lookup, state select). GPS "Use my location" is optional; if denied → manual pincode, never a dead end. Draft persisted (name, phone, address) so refresh loses nothing. Dispatch/delivery date from quote.dispatchBy in IST.
 Review & pay: line summary, totals, policy checkboxes (Terms + Refund policy links), Turnstile placeholder component (`<TurnstileWidget/>` mock that resolves a token; real one later), honeypot hidden field, COD option only if config.cod. Button "Pay ₹459" (exact quote total); loading state; double-tap safe via Idempotency-Key.
 Razorpay mock: `RazorpayCheckoutMock` modal (same API shape as Checkout.js: open, success handler, dismiss, failure) with buttons Success / Fail / Close to test: success → order paid; fail → retry on same order, no duplicate; dismiss → order stays pending_payment with "Resume payment" on the order page. Lazy-load this module only on /checkout.
 After pay: redirect to /order/:code. Back button after payment must not re-submit.

ORDER STATUS (/order/:code): requires last-4 of phone (gate form on first visit; remembered for session). Timeline Placed → Paid → Packed → Shipped → Delivered (labels adapt to mode), cancelled/refunded/expired banners. When shipped: courier name, tracking ID (copy button), tracking link from a per-courier URL template in config. Show items, totals, address, dispatch date, "Download invoice" (→ /invoice/:code?t=), "Share on WhatsApp" (wa.me link), contact shop button. aria-live announce status changes. /track = lookup form (code + last 4) with generic error that leaks nothing.

INVOICE (/invoice/:code?t=): printable page (print.css), B2C and B2B variants (GSTIN, HSN, per-line CGST/SGST/IGST, place of supply, invoice no. series per FY Apr–Mar, rounding note); forged/expired token → generic "link invalid" page. PDF = browser print for now.

RESERVATIONS + PAYMENT STATES (frontend contract, mirrors the real backend):
- Creating an order reserves stock for 15 minutes (`payBy` timestamp on the order). While `pending_payment`, the order page shows "Complete payment to confirm your order" with a Resume payment button; no scary countdown, just the time. After `payBy` the order becomes `expired` with "Start again" (re-adds lines that are still in stock; tells the user which are not).
- **Late/duplicate webhook behaviour:** after the mock payment returns success, the order may still be `pending_payment` for a while (`devSim.webhookLate`). The UI must show "We are confirming your payment. Please do not pay again." and poll the order every 3 s for 60 s, then every 15 s, with a "Check status" button and contact options. It must never offer "Pay again" while a payment attempt is unresolved.
- If `devSim.amountMismatch` is on, the customer sees "Payment received, we are verifying your order" and the admin sees a flagged order.
- Payment failure: keep the same order, show the reason, offer retry or change method; never create a second order.

EMAILS (mock outbox, `/dev/outbox`): build HTML + plain-text templates in `src/emails/` for order confirmation (items, totals, address, dispatch date, status link, invoice link), shipped (courier, tracking ID, link), cancelled, refunded, wholesale approved/rejected, OTP, and the owner new-order alert. Sent through an `EmailProvider` interface (mock writes to the outbox). `devSim.emailFail` makes sending fail: the order still succeeds, the admin order shows an "Email failed" flag with Retry.

FREE-DELIVERY NUDGE AND COURIER TRACKING (Section O3 and O4): the cart and checkout show a real, quote-engine-driven line such as "Add ₹X more for free delivery" only when a free-delivery threshold exists for the customer's zone; order status shows courier, AWB and a "Track on courier site" link once admin has entered them.
CONTACT + ANALYTICS: add `<ContactActions/>` on cart, checkout, order status and the busy page. Build `<WhatsAppWidget/>` exactly as Section N4 says (mounted once in the customer layout, cart-aware message, open/closed from config hours). Call typed analytics events (no-op until P8): view_cart, begin_checkout, add_shipping_info, add_payment_info, purchase (fires once per order, de-duplicated in localStorage), remove_from_cart, add_to_cart. Capture first-touch UTM params in sessionStorage and attach as `attribution` on the order payload.
Output: full files only. Then 5 tests.
```
**Accept when:** webhookLate scenario shows the confirming state and never offers a second payment; reservation expiry produces the expired state with working Start again; emailFail flags the order without breaking it; dispatch dates skip Sundays and config holidays; 20 hand-calculated carts match to the paisa; all unit cases green; kill network mid-cart then reload → cart survives and stale lines are handled; double-tap Pay → one order; Success/Fail/Close mock outcomes all end in the right state exactly once; order lookup without last-4 reveals nothing.

## P4 — Wholesale + India shipping (Part J, sessions 6A/6B)
```
WHOLESALE
/wholesale: explainer (benefits from config, MOQ, how approval works, phone/WhatsApp visible), CTA Register / Login / Request quote.
/wholesale/register: business name, owner name, GSTIN (validate format + checksum + state code), phone, email, state, address; submits → "Pending approval" screen with what happens next.
/wholesale/login: email OTP (6 digits; resend timer 30 s; 5 attempts then lock message; mock accepts 123456). Admin and wholesale use the same OTP component.
/account: status chip (Pending/Approved/Rejected with reason), approved → wholesale price visibility switches on everywhere (catalog, product, cart re-quote), my orders list, my quote requests. Switching buyer type triggers a cart re-quote with a toast.
/wholesale/quote: pick SKUs + qty from a searchable list, message, submit → acknowledgement + entry in admin inbox.

INDIA SHIPPING (customer side)
Pincode/state serviceability check component reused on product page, cart, checkout. Shipping line shown with weight and slab ("2.3 kg · ₹90"). Non-serviceable pincode → clear message + phone/WhatsApp, never a dead end.
Quote requests: guests allowed (name, phone, optional GSTIN, SKU+qty lines, message); prefilled when logged in; acknowledgement page + owner alert email (outbox) + admin inbox entry. Fire analytics `generate_lead` (type wholesale_register | quote_request) with no PII.
Output: full files only. Then 5 tests.
```
**Accept when:** unapproved buyer cannot see wholesale price in DOM or network; MOQ−1 blocked, MOQ OK; tier price switches at boundary; GSTIN checksum rejects bad values; 499/500/501 g slab fees correct.

## P5 — Admin (plan S6, S8–S10, Part J5)
```
Also build the dispatch form and notification templates from Section O3 and O2, and the credit-note placeholder from O8.
Follow Section J2 (admin master-detail at 1024 px+). Admin is a DIFFERENT product feel from the shop: DM Sans only (no Fraunces), denser, near-zero motion, works on a cheap Android tablet and phone. All lists become stacked cards <768 px. Every write: Zod-validated, audit-log entry, optimistic UI with rollback on failure, destructive actions confirm by naming the thing ("Archive Aloo Bhujia 200 g?").

/admin/login: email OTP (allowlist from config, two owner emails), Turnstile placeholder, generic errors. Session = mock cookie.
/admin (Today): counts (new, to pack, shipped today), revenue today (IST), low-stock list, shop switch (Open / Busy +X min + message / Closed + reason + reopen time; auto by hours with manual override), "Enable sound" button + visible "Sound ON" indicator, "Keep screen on" (navigator.wakeLock, feature-detected).
/admin/orders: filter tabs New / To pack / Shipped / Delivered / All, search by phone or code, date filter in IST, new-order alert (sound after one-tap unlock, row highlight, document.title badge), polling every 25 s with backoff, paused while tab hidden, "last updated" time, offline banner. CSV export.
/admin/orders/:id: items with SKU snapshots, notes, address, phone (tap to call), map link, payment badge + amount-mismatch flag, big action buttons only for legal next transitions (Accept/Pack, Mark shipped, Deliver, Cancel with reason, Refund with reason), Mark shipped REQUIRES courier + tracking ID (config required/optional), print pick list, print shipping label (4×6 in CSS, address block, order code, weight), print kitchen/packing slip (58/80 mm CSS), email-failed flag if mock email failed, audit trail.
/admin/products + /:id: product CRUD with draft/active/archived, SKU table inside (sku_code, pack label, net weight, ship weight, MRP, retail, wholesale, MOQ, tiers, stock, low-stock-at, GST %, HSN, status). SKU code auto-suggested (initials + grams, editable) and LOCKED once any order uses it (archive + create new). Image upload = file picker + client-side resize to 800 and 320 px WebP (canvas), 5 MB cap pre-resize, magic-byte check. Price edit writes price_log. One-tap "Sold out today" + numeric stock.
/admin/import: CSV import for products+SKUs+stock: choose file → DRY RUN table (row-by-row errors/warnings, duplicates, negative stock) → commit only if zero errors (never partial silent failure) → error report download; export current catalog as CSV; sample template download.
/admin/wholesale/buyers: approval queue (approve/reject with reason, GSTIN shown + validity), approved list. /admin/wholesale/quotes: inbox with status and reply note.
/admin/shipping: weight-slab table editor by zone/state (add/edit/delete rows, overlap validation), free-shipping threshold, serviceability list. /admin/zones: pincode list + fee + min order. /admin/coupons: CRUD + usage view.
/admin/reports: today / 7d / 30d orders, revenue, top SKUs (use a simple bar chart: single colour, labelled directly, no legend clutter, accessible table beneath). /admin/settings: contact, banner message, free-ship threshold, COD toggle, dispatch days. /admin/backup: instructions + "Export all data" button (admin-triggered).
PRODUCT EDITOR SEO FIELDS: seoTitle (counter, soft limit 60), seoDescription (counter, soft limit 155), altText per image, slug (editable; old slugs saved to slugHistory), category description, product FAQ (add/remove Q&A), live "Google-style" preview of title/description, and warnings for empty/duplicate titles. Wholesale price fields are clearly labelled "never shown publicly".
/admin/audit: global audit log (who, when, what, entity, before/after summary), filter by entity and date, newest first, read-only.
ORDER DETAIL: show the email log for that order (sent/failed + Retry), payment attempts, amount-mismatch flag with resolve action, reservation expiry time.
SESSIONS: `devSim.sessionExpired` makes the next admin call return 401: UI must keep unsaved form data, redirect to login with `next`, and return to the same page.
Motion in admin: only new-order row enter + highlight. Nothing else.
Output: full files only. Then 5 tests.
```
**Accept when:** owner can run a full day on mock data without a developer: receive order, pack, mark shipped with tracking, change a price, mark sold out, close shop, import CSV with errors then fixed; every `/admin/*` route redirects to login when logged out; admin usable at 360 px and 768 px.

## P6 — PWA + mobile-native feel (plan S11) — **OPTIONAL ADD-ON. Skip unless the client buys the installable-app add-on. Everything here is behind `config.features.pwa`.**
```
Only implement when features.pwa is true; when false the app must behave as a normal website with no manifest, no service worker and no install banner.
manifest.webmanifest: name, short_name, start_url "/?source=pwa", scope, display standalone, theme/background colours from config, icons 192/512 + maskable 512 (generate simple placeholder icons from brand initials), shortcuts "Shop now" and "My order". Reserve /.well-known/assetlinks.json.
Service worker (vite-plugin-pwa/Workbox): precache shell; stale-while-revalidate for images; network-first with cache fallback for catalog JSON; NEVER cache /api/orders, /api/admin, /api/payments, checkout, invoice, wholesale-priced responses. Offline page (/offline) with Call button. Update prompt banner "New version available — Refresh". 
Custom install banner after 2nd visit or after first order (never on first load) + iOS hint "Share → Add to Home Screen". 
Native-feel CSS/meta: 100dvh, safe-area insets, theme-color = header colour, touch-action manipulation, tap highlight off, inputs ≥16 px, overscroll-behavior contain in sheets, hover only under (hover:hover), no text selection on buttons, pull-to-refresh not hijacked.
Offline during checkout: clear message, no duplicate order on reconnect (idempotency key reused).
Output: full files only. Then 5 tests.
```
**Accept when:** with `features.pwa=false` there is NO manifest link and NO service worker registration (check Application tab); with it true: Lighthouse "installable"; airplane mode shows offline page with Call button; redeploy shows update prompt; offline checkout does not duplicate orders.

## P7 — Motion + polish (plan S12). Only after P1–P5 pass (and P6 if the PWA add-on is bought).
```
Add motion using ONLY the tokens in A9. No new durations. Use LazyMotion + m.* from 'motion/react'. Wrap app in MotionConfig reducedMotion="user".

ELEMENT SPEC
- Home hero (the ONE hero moment): headline → sub → CTA → image, opacity 0→1 + translateY 12→0, ease-out, --dur-base each, stagger 50 ms, total < 700 ms. Plays once per session.
- Route change: cross-fade 160–240 ms (opacity only), no layout jump, scroll restoration kept.
- Shop: category chip underline = shared layoutId transform slide (--dur-fast); press scale 0.96 on buttons, chips and steppers, 0.98 on large cards (--dur-instant); image fade-in on load (opacity, fixed aspect → zero CLS); list stagger on first paint only, first 8 cards, 50 ms.
- Add to cart: Add button → Stepper swap (spring 520/30); CartBar slides up from translateY(100%) (--dur-base ease-out); count badge pulse scale 1→1.15→1 (--dur-fast); optional "fly to cart" ONLY if profiling stays 60 fps — otherwise skip; haptic vibrate(10).
- Bottom sheet: spring 380/34 up, backdrop opacity fade (--dur-fast), drag-to-dismiss (close if offset.y > 120 or velocity.y > 500, rubber-band upward drag), focus trap + restore, Esc closes, body scroll locked.
- Cart line remove: exit ease-out, 20% shorter + siblings collapse via layout transform (AnimatePresence popLayout), Undo toast enters translateY+opacity.
- Toasts: enter/exit opacity+translateY 8 px, auto-dismiss 4–5 s, pause on hover/focus.
- Order timeline: step fill = scaleX transform-origin left, --dur-slow, when status changes.
- Checkout: button loading = inline spinner (no layout change); inline validation = colour + message (NO shake); step accordion = opacity + transform only (use grid-rows trick or layout animation, never height keyframes).
- Admin: new-order row enters with a 1.2 s background-colour highlight fade (opacity of an overlay layer, not background-color transition). Nothing else.
- Skeletons: static shimmer-free (opacity pulse 1→.6, 1.2 s) — one pulse style only.
PERFORMANCE: no blur animation, no box-shadow animation, will-change only on active animations, no animation on scroll handlers (IntersectionObserver for reveals, max 3 sections, CSS or m.* whileInView once).
REDUCED MOTION: everything becomes opacity-only/instant; no springs, no haptics, no hero sequence.
ANTI-SLOP PASS: run the A10 list and the K3 bans against every screen and fix violations. MOTION PASS: run K8 against every animated element and output the Before/After/Why table.
Output: full files only + list of every animated element with its token and property. Then 5 tests.
```
**Accept when:** Chrome Performance trace on 4× CPU slowdown shows no dropped frames in sheet/cart/route transitions; reduced-motion walkthrough passes (OS setting on); `motion` bundle chunk ≤ 30 KB gz; no animated property outside transform/opacity.

## P7B — UI/UX polish and critique pass (after P7, before P8)
```
No new features. Make the UI feel designed. Follow Sections J, K and L exactly. Start by re-reading docs/design-plan.md.
1. For every customer and admin screen, apply the layouts in J2 and the navigation in J3. Fix deviations.
2. Apply the signature details in J1 and the imagery rules (ImageSlot fallbacks must look intentional, never broken).
3. Replace every placeholder string with the copy in J5 and keep all strings in i18n.
4. Run the J6 checklist AND the K6 technical checklist for each screen at 375, 768 and 1280 px. Write the results into docs/progress.md as a table (screen x check, pass/fail) and fix every fail.
5. Run the anti-slop list (A10) and every ban in K3 once more and remove violations. Check the K1 memorable detail is present and the rest of the UI stays quiet.
6. List the 10 remaining weakest visual points and fix them.
7. Motion and SEO/performance cross-checks (K8 table and K9 list), then the self-review pass (K7): view each screen as a stranger on a mid-range phone, write the 5 things that look most generic, change them.
Output: changed files only, plus the J6 + K6 results table.
```
**Accept when:** J6 and K6 tables are all pass (P7C, when enabled, is checked after it); the 5-second test is plausible for home, product and checkout; no layout shift on any screen; admin master-detail works at 1024 px+; the UI looks consistent across all screens (same buttons, chips, cards).

## P7C — Experience layer: 3D hero + scroll storytelling (after P7B, before P8; ONLY if `config.features.experience` is true; Section M is the spec)
```
Build the Experience layer exactly as Section M says. This is an add-on to the home page; nothing in the ordering flow may depend on it.

1. `src/experience/` with: `gate.ts` (pure `shouldLoadExperience(env)` returning {load, reasons[]}), `quality.ts` (adaptive DPR + frame-time monitor), `HeroScene.ts` (vanilla Three.js, tree-shaken imports, no R3F), `Story.tsx` (GSAP ScrollTrigger pinned story, one per page), `reveals.ts` (SplitText headline mask + clip-path image reveals), `ExperienceHost.tsx` (lazy `import()` after the first paint and idle, error boundary, poster fallback, Pause/Play control).
2. Home page: the static hero (poster image 4:3 with `fetchpriority=high`, H1, CTA) renders first and is the LCP element. The canvas fades in over it only after the gate passes. Never replace the H1, CTA or facts with canvas content.
3. Hero model: load `config.experience.heroModelUrl` (GLB, Draco or meshopt, self-hosted decoders). If it is empty, do NOT invent a model: use `hero:'text'` (GSAP masked headline reveal on the static hero) and keep the Story. Build `/dev/experience` with a procedural demo shape that exists only in dev.
4. One pinned scroll story ("How your order reaches you", real content from config/i18n, 3 to 4 steps) on ≥ 768 px; below 768 px, reduced motion or gate failure it renders as a plain stacked list. Same text in the DOM in reading order in every case.
5. `/dev/experience` inspector (Section M7): gate decision with reasons, force on/off, simulate low-end, FPS and frame-time graph, `renderer.info` (calls, triangles, geometries, textures), GLB and chunk sizes, context-loss test.
6. Tests (vitest): `shouldLoadExperience` for every reason (reduced motion, save-data, 2g/3g, low memory, few cores, no WebGL2, narrow viewport, user opt-out); the stacked fallback renders the same text.
Output: full files only. Then 5 tests.
```
**Accept when:** with the flag OFF the build has no `three` or `gsap` in any chunk (check the bundle report); with it ON the initial JS is unchanged (≤ 170 KB gz) and the experience chunks load only after first paint and idle; LCP element is the static hero image; Lighthouse mobile performance ≥ 90 with the experience enabled AND disabled (preview caveat noted); CLS 0 from the canvas; reduced motion, Save-Data, `?experience=off`, and WebGL-disabled all show the static hero and stacked story with identical text; Pause control stops all auto motion; ScrollTriggers are killed on route change; the 3D scene is disposed on unmount (geometries and textures return to 0 in `/dev/experience`); K6 and J6 still pass on home.

## P8 — SEO + AI-search readiness, analytics + consent, legal, performance, accessibility, security headers (plan S9/S13)
```
Implement Sections E, F, G and I of the spec exactly. Nothing here is "basic". Do not mark a check as passed without verifying it.

1. SEO ENGINE (Section F): finish src/seo/render.ts as a PURE function (route + data + config -> {head, jsonLd[], factsHtml, status}). Cover every indexable route in Section E. Add robots.ts (modes allow-all | search-only | block-ai), sitemap.ts, llms.ts. Per-route titles/descriptions/canonicals/OG/Twitter exactly per F3. JSON-LD per F5 (Store/LocalBusiness + WebSite on home; BreadcrumbList; Product with one Offer per SKU, retail price only; FAQPage where a visible FAQ exists; MerchantReturnPolicy + OfferShippingDetails only when config has the values). JSON-LD price/availability MUST equal the visible text.
2. PRERENDER: index.html gets two placeholders (`<!--seo-head-->` in head, `<!--seo-facts-->` inside #root). scripts/prerender.ts runs after `vite build`, loops every indexable route (all products and categories from the catalog snapshot), calls render.ts, and writes dist/<route>/index.html. Add npm scripts: build, prerender, build:seo (both). The same render.ts will be used by the Worker later (HTMLRewriter), so keep it free of DOM/React imports.
3. /dev/seo INSPECTOR: table of every indexable route with title, description (with length colour check), canonical, robots meta, OG tags, pretty JSON-LD, the exact factsHtml, and automatic validation (title about 50 to 60 and description about 120 to 155 characters as amber WARNINGS only, because search engines truncate by pixel width and may rewrite them; one H1, all images have alt, duplicate titles/descriptions, JSON-LD price equals visible price, no wholesale value anywhere in the output, canonical has no query string). Failing rows are red.
4. TESTS (vitest) in src/seo/seo.test.ts: robots output for the 3 modes; sitemap contains only indexable routes and never /admin, /cart, /checkout, /order, /invoice, /account, /dev; no wholesale price or wholesale SKU field in ANY render output; canonical strips ?pack=, ?sort=, ?q=; query-param variants get noindex,follow; unique titles; Product JSON-LD offers match catalog retail prices.
5. ANALYTICS + CONSENT (Section G): implement consent.ts, ConsentBanner (non-blocking bottom bar, equal-weight Accept / Reject buttons, link to Privacy, "Cookie settings" link in the footer reopens it), track.ts with GA4 loader that runs only when config.analytics.ga4Id exists AND consent granted, typed events per G3, PII guard (a runtime check that drops any param whose key matches name|phone|email|address|gstin|pincode), purchase de-duplication, UTM first-touch. If no ga4Id, the banner is not shown (essential storage only). /dev/analytics shows the event log with a PII-guard counter.
6. LEGAL pages from config (no lorem): Privacy (DPDP-aware: data collected, purpose, retention 24 months, deletion request contact, third parties: Razorpay, Cloudflare, email provider, Google Analytics if enabled, courier; list essential storage keys), Terms (prices/stock can change, delivery estimates not guaranteed, wholesale terms), Refund/Cancellation (food: no returns except damaged or wrong item with photo proof within X hours — mark "client to confirm"), Shipping (zones, slabs, dispatch days, tracking), Contact with real config NAP. Every legal page shows a "Last updated" date. Footer shows FSSAI, GSTIN, legal name, address.
7. PERFORMANCE: route-level code split; Razorpay mock + analytics lazy; initial JS ≤ 170 KB gz; LCP ≤ 2.5 s mid-range 4G, INP ≤ 200 ms, CLS ≤ 0.1; fonts subset + swap + preload ONE; images via ImageSlot (webp, srcset, width/height); no console errors/warnings on any route; no layout shift from consent banner (reserve space or overlay with transform only).
8. ACCESSIBILITY: landmarks, one H1, heading order, skip link, focus-visible, labels, 44 px targets, aria-live regions, 200% zoom without loss, 320 px no overflow, text over photos has a scrim, no colour-only meaning, tables have captions and th scope, consent banner is keyboard reachable and does not trap focus.
9. SECURITY HEADERS: generate public/_headers per Section I3 and list in docs every external origin used with the reason.
10. FINAL: write docs/audit.md with each check, pass/fail, evidence (what you observed), and what was fixed.
Output: full files only. Then 5 tests.
```
**Accept when:** `/dev/seo` is all green; `npm run build:seo` produces `dist/p/<slug>/index.html` whose HTML (view source) contains the title, canonical, JSON-LD and the Quick-facts text WITHOUT running JavaScript (check with `curl`/view-source, not DevTools Elements); `grep -ri wholesale dist/` finds no wholesale price values; robots/sitemap tests pass; consent: with a GA id set, nothing loads before Accept (Network tab shows no googletagmanager request), Reject keeps it off, banner returns via footer link; `/dev/analytics` shows no PII; Lighthouse mobile ≥ 90 on all four (preview-environment caveat noted); legal pages show real config values; 320/360/375/414/768/1280 px all clean.

## P9 — Boundary QA, handoff documents, final audit (plan S14 front half)
```
No new features. This prompt proves the prototype and produces the handoff pack.

1. Run EVERY scenario in Section H2 using /dev/sim. For each: trigger it, record what the UI does, compare with the expected behaviour in the table, and fix mismatches. Report as a table (scenario, expected, observed, fixed?).
2. Run the full automated suite (vitest: quote, gst, status machine, seo, analytics PII guard, money). All green, with the case count in the report.
3. Generate docs/api-contract.md, docs/data-model.md, docs/handoff.md per Section I1/I4/I5 (accurate to the code you actually wrote, not to the spec). Generate .env.example per I2.
4. Drift check: compare the code to Section A rules 1–22 and list violations ONLY; fix them. Run the A10 anti-slop list on every screen.
5. Write `docs/swap-checklist.md`: the ordered steps to turn this master into a new customer site with NO code change beyond data: (0) write a one-page concept sheet for the customer: 8 to 12 things that belong to this client and to no competitor (name, place, dishes, real shop colours, history), the three dials (K1), and the photo plan; (1) send the client `docs/client-intake.md` and fill the answers into config, then copy `client.demo.config.ts` to `client.config.ts` and fill brand, contact, legal (GSTIN, FSSAI), hours, zones, shipping slabs, thresholds, feature flags, seo, analytics id; (2) theme overrides and fonts via config only (keep contrast ≥ AA, re-run `/dev/styleguide`); (3) logo and favicon set; (4) product photos and lifestyle photos into the image base URL; (5) catalog data (CSV import or seed file); (6) copy and the FAQ/About facts in `i18n/en.ts`; (7) legal pages values; (8) `npm run build:seo` and `/dev/seo` green; (9) the I4 mock-to-real table for backend work. State clearly which items need the client (J9). Also list what must NEVER be edited per customer (shared/, api contract, seo/render.ts logic).
6. Write `docs/client-intake.md` (N6): the one-page questionnaire to send a new client, each question mapped to its config key, with the "you must supply" list from J9. Confirm `CLIENT_STRICT=1 npm run check:client` passes on a filled-in copy of the demo config.
7. Write `docs/upgrade-guide.md` (O7): how a customer repo pulls fixes from the master without conflicts, and how releases are tagged. Run the CI scripts only if you have a terminal and paste the real output; otherwise write "not run: needs terminal or CI" for each.
8. Print the final file tree, the list of dependencies (justify any not in A2), bundle sizes per chunk (gz), and a list of every mock with its real replacement.
Output: the report first, then changed files only.
```
**Accept when:** all H2 scenarios pass; `/dev/checks` is all green; the CI workflow file exists and its steps match the npm scripts (they run for real after GitHub sync, so say so); `docs/upgrade-guide.md` exists; `docs/swap-checklist.md` exists and a dry run with `?client=demo` follows it without touching code; docs exist and match the code; no rule violations remain; mock-to-real table is complete; the project builds clean (`npm run build:seo` with zero warnings).



---

# SECTION D — DECISIONS (change only with a written reason)
1. **Catalog variant = packaged goods (namkeen), retail + wholesale + all-India** (Part J). RESOLVED: the open scoping question is closed. Hot-food slots/board are not built; `catalogMode: 'hot-food'` exists as a config flag only.
2. **Admin = order list with filters**, not a Kanban board. Sound, wake-lock and polling kept.
3. **Fonts: Fraunces + DM Sans**, Noto for Telugu/Devanagari. Display serif only on shop headings, never admin.
4. **Motion library: `motion` with LazyMotion** for all UI. **GSAP + ScrollTrigger and vanilla Three.js are allowed ONLY in the Experience layer (Section M)**: home and other Persuade pages, lazy-loaded after the first paint, device-gated, with a static fallback. Never on cart, checkout, order, account or admin. No Lottie, Spline, R3F or drei.
4b. **Experience layer default:** `features.experience` is true in `client.demo.config.ts` and a customer can turn it off with one flag; the site must be fully correct, fast and indexable with it off.
5. **Mock API = the contract.** When the real Hono Worker exists, only `src/api/client.ts` changes. `src/shared/` and `src/seo/` move to `/packages/shared` untouched.
6. **Razorpay and Turnstile are mock components** with real call shapes; real keys, hosted Checkout, Siteverify and webhooks come with the Worker.
7. **PWA is NOT in the ₹45,000 quote.** P6 is an optional add-on behind `features.pwa` (default false). The site is fully usable and installable-ready only when the flag is on.
8. **SEO approach:** a pure `renderSeo()` used three ways: live component, build-time prerender now, Worker HTMLRewriter injection later. Reason: a client-rendered Vite SPA gives crawlers (especially AI crawlers, most of which do not run JavaScript) an empty page unless facts are in the first HTML. Prerendered prices go stale when the owner edits a price, so production must inject from the database at the edge with a short cache (≤ 60 s).
9. **AI-bot policy default `allow-all`** (the client wants to be found and cited). `search-only` and `block-ai` exist as config choices. Confirm with the client. robots.txt is a request, not enforcement; also check Cloudflare's own bot/AI-crawler settings in the client's account so they match the chosen mode.
10. **Analytics = GA4 with consent.** No analytics cookies before Accept. If no GA id is configured, no banner.
11. **Customers cannot self-cancel in v1.** Order page shows "Need a change? Call or WhatsApp us" (ContactActions). Cancellation is an admin action.
12. **Wholesale quote request is open to guests** (lead capture), wholesale PRICES need an approved account.
13. **Not verifiable in AI Studio:** real-device Lighthouse, Worker 10 ms CPU, D1 limits, email deliverability, real Razorpay webhooks, Cloudflare bot settings, prerender behaviour on the Worker. Those stay in the master plan Part E tests.
14. **Client-dependent placeholders** (marked "client to confirm"): refund wording, GST rates/HSN, shipping slabs, MOQ, dispatch days, holidays, brand colours/logo, AI-bot mode, FAQ answers.


# SECTION E — ROUTES, GUARDS, INDEXING (authoritative)
Guards are route loaders. `next=` is preserved through login. Indexing = what the page's own meta robots says; "Disallow" = also listed in robots.txt. Pages that must never appear in search are BOTH noindex and Disallow (belt and braces); forms we want crawlers to see as noindex are noindex only.

| Path | Guard / gate | Indexing (meta + robots) | In sitemap | Notes |
|---|---|---|---|---|
| `/` | public | index | yes | Home. Title from config. Store + WebSite JSON-LD. |
| `/shop` | public | index (noindex,follow when ANY of q, sort, veg, pack, price present) | yes | Canonical always /shop. All products. |
| `/c/:slug` | public | index (noindex,follow with query params) | yes | NEW. Crawlable category page. Breadcrumb JSON-LD. Replaces ?cat= for SEO; /shop?cat=x redirects to /c/x. |
| `/p/:slug` | public | index | yes | Product. Canonical strips ?pack=. Product+Offer, Breadcrumb, FAQ JSON-LD. Unknown slug = NotFound (data-status=404) + similar products. Old slugs redirect (slugHistory). |
| `/cart` | public | noindex,nofollow + robots Disallow | no | Empty cart shows CTA. |
| `/checkout` | guard:cartNotEmpty | noindex,nofollow + Disallow | no | Empty cart redirects to /cart with toast. |
| `/order/:code` | gate:last4 | noindex,nofollow + Disallow | no | Last-4 phone gate. Never leaks existence on failure. |
| `/track` | public | noindex | no | Lookup form, generic error. |
| `/invoice/:code` | gate:signedToken (?t=) | noindex,nofollow + Disallow | no | Invalid or expired token shows generic 'link invalid'. |
| `/wholesale` | public | index | yes | Marketing + how approval works. No prices shown. |
| `/wholesale/register` | guard:guestOnly | noindex | no | Logged-in buyer redirects to /account. |
| `/wholesale/login` | guard:guestOnly | noindex | no | Email OTP. |
| `/wholesale/quote` | public (guests allowed, prefilled if logged in) | noindex | no | Quote request form (name, phone, optional GSTIN, SKUs, message). |
| `/account` | guard:buyer | noindex,nofollow + Disallow | no | Redirect to /wholesale/login?next=. |
| `/about` | public | index | yes | Factual: who, where, what, coverage, FSSAI. No invented claims. |
| `/contact` | public | index | yes | NAP identical to config everywhere. LocalBusiness JSON-LD. |
| `/faq` | public | index | yes | NEW. Visible Q&A from config.seo.faq plus shipping/wholesale answers. FAQPage JSON-LD. |
| `/policies/privacy` | public | index | yes | Last-updated date visible. |
| `/policies/terms` | public | index | yes |  |
| `/policies/refund` | public | index | yes | Mark 'client to confirm'. |
| `/policies/shipping` | public | index | yes | Zones, slabs, dispatch days, tracking. |
| `/offline` | public | noindex | no | Only when features.pwa. |
| `/busy` | public | noindex | no | Production returns 503 + Retry-After. |
| `/maintenance` | public | noindex | no | config.maintenance=true renders this for every customer route (admin exempt). Production 503. |
| `*` | public | noindex | no | 404 page. data-status=404. Production Worker returns real 404. |
| `/admin/login` | public | noindex,nofollow + Disallow | no | OTP + Turnstile mock. |
| `/admin` | guard:admin | noindex,nofollow + Disallow | no | Today. |
| `/admin/orders` | guard:admin | same | no |  |
| `/admin/orders/:id` | guard:admin | same | no |  |
| `/admin/products` | guard:admin | same | no |  |
| `/admin/products/:id` | guard:admin | same | no | Includes SEO fields. |
| `/admin/import` | guard:admin | same | no |  |
| `/admin/wholesale/buyers` | guard:admin | same | no |  |
| `/admin/wholesale/quotes` | guard:admin | same | no |  |
| `/admin/shipping` | guard:admin | same | no |  |
| `/admin/zones` | guard:admin | same | no |  |
| `/admin/coupons` | guard:admin | same | no |  |
| `/admin/reports` | guard:admin | same | no |  |
| `/admin/audit` | guard:admin | same | no | NEW. Global audit log. |
| `/admin/settings` | guard:admin | same | no |  |
| `/admin/backup` | guard:admin | same | no |  |
| `/dev/styleguide` | guard:devOnly | Disallow | no | Dev tools exist only when import.meta.env.DEV or VITE_ENABLE_DEV=1. Stripped from production. |
| `/dev/sim` | guard:devOnly | Disallow | no | NEW. Boundary simulator (Section H). |
| `/dev/outbox` | guard:devOnly | Disallow | no | NEW. Mock emails sent. |
| `/dev/seo` | guard:devOnly | Disallow | no | NEW. SEO inspector (Section F). |
| `/dev/analytics` | guard:devOnly | Disallow | no | NEW. Event log. |
| `/dev/quote-cases` | guard:devOnly | Disallow | no | Quote engine cases. |
| `/dev/experience` | guard:devOnly, only when features.experience | Disallow | no | NEW. Experience-layer inspector (M7). |
| `/dev/checks` | guard:devOnly | Disallow | no | NEW. In-browser verification dashboard (O9). |

**Machine-readable files**

| File | Source |
|---|---|
| `/robots.txt` | generated from config (Section F4) |
| `/sitemap.xml` | generated from catalog; indexable routes only; lastmod; no wholesale data |
| `/llms.txt` | optional (features.llmsTxt): plain-text map of key pages |
| `/manifest.webmanifest` | only when features.pwa |
| `/.well-known/assetlinks.json` | reserved for the Play Store add-on |

**Redirect rules (client-side now, real 301s in the Worker later):** `/shop?cat=x` → `/c/x`; old product slug → current slug (`slugHistory`); trailing slash → none; uppercase → lowercase. **Status codes the Worker must return (document in handoff):** 200, 301 (slug history, canonicalisation), 404 (unknown product, category or path, never a soft 404), 429 (rate limit with `Retry-After`), 503 (maintenance/busy with `Retry-After`).

---

# SECTION F — SEO + AI-SEARCH (GEO) SPEC

## F1 Principles
1. Crawlers, including most AI crawlers, may not run JavaScript. If a fact is not in the first HTML it may not exist for them.
2. Visible text, JSON-LD and the sitemap must agree. Never mark up what the user cannot see.
3. One canonical URL per page. Facets and sorts are not pages.
4. Be specific and factual (numbers, units, places). No invented claims, ratings or awards. Reviews JSON-LD only if real reviews exist in config.
5. Wholesale prices and buyer data never appear in any public output.

## F2 Rendering strategy (three layers, one function)
- **A. `seo/render.ts` (pure):** `renderSeo(route, params, data, config) → { status, head:{title,description,canonical,robots,og[],twitter[],links[]}, jsonLd[], factsHtml }`. No React, no DOM, no fetch. This is the unit-tested core.
- **B. Build-time prerender (this prototype):** `scripts/prerender.ts` writes static HTML for every indexable route and every product/category. Placeholders: `<!--seo-head-->`, `<!--seo-facts-->`.
- **C. Edge injection (production, later):** the Worker fetches the SPA shell and fills the same placeholders from D1 using HTMLRewriter, cached ≤ 60 s, so price/stock edits reach crawlers within a minute. Must be profiled against the 10 ms CPU limit. Return real status codes.
- Injected `factsHtml` must equal what the user sees after hydration (same content, same order). No cloaking.

## F3 Head spec per route
Title pattern `%s | {brand}`; aim for about 60 characters or fewer (a lint proxy, not a hard limit). Description about 120 to 155, unique per page, specific to the page, no invented claims.
| Route | Title source | Description source |
|---|---|---|
| `/` | `config.seo.homeTitle` | `config.seo.homeDescription` |
| `/c/:slug` | "{Category}: buy online" (editable on category) | category.description first 150 chars, else template |
| `/p/:slug` | `product.seoTitle` else "{Name}, {smallest pack} to {largest pack}" | `product.seoDescription` else template: "{Name}: {key ingredient list, short}. {Veg or non-veg}. Packs {sizes} from ₹{lowest retail}. Ships across India. FSSAI {no}." |
| `/shop` | "All products" | generic from config |
| `/about`, `/contact`, `/faq`, `/wholesale`, policies | fixed i18n strings | fixed i18n strings |
Also on every indexable page: `<link rel="canonical">` (absolute, from `config.seo.siteUrl`, no query), Open Graph (`og:title,description,type,url,image,site_name,locale=en_IN`; product pages use `og:type=product` plus price/currency tags are optional), Twitter card `summary_large_image`, `<html lang="en-IN">`, `<meta name="theme-color">`, `google-site-verification` from config when set. 1200×630 default OG image; product pages use the main product image. No hreflang until a second language is actually translated.

## F4 robots.txt and AI-bot policy
Generated from config, never hand-edited:
```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api
Disallow: /cart
Disallow: /checkout
Disallow: /order/
Disallow: /invoice/
Disallow: /account
Disallow: /dev
Sitemap: {siteUrl}/sitemap.xml
```
Per-bot groups depend on `config.seo.aiBots`:
| Bot token | Operator | Purpose | allow-all | search-only | block-ai |
|---|---|---|---|---|---|
| Googlebot, Bingbot, Applebot | search engines | search indexing | allow | allow | allow |
| OAI-SearchBot | OpenAI | ChatGPT search results | allow | allow | block |
| ChatGPT-User | OpenAI | fetches pages when a user asks | allow | allow | block |
| PerplexityBot, Perplexity-User | Perplexity | search index / user fetch | allow | allow | block |
| Claude-SearchBot, Claude-User | Anthropic | search / user fetch | allow | allow | block |
| GPTBot | OpenAI | model training | allow | block | block |
| ClaudeBot | Anthropic | model training | allow | block | block |
| Google-Extended | Google | control token for AI model use | allow | block | block |
| Applebot-Extended | Apple | control token for AI model use | allow | block | block |
| CCBot | Common Crawl | open dataset | allow | block | block |
Bot names and purposes change: the generator keeps the list in one array with a "verify against each operator's documentation before go-live" comment. robots.txt is advisory; also check Cloudflare's own bot and AI-crawler settings so the account does not block what robots.txt allows (or the reverse). `Allow`/`Disallow` for the wildcard group must remain identical in every bot group (a bot group replaces the wildcard group, so repeat the Disallow lines in each group).

## F5 Structured data (only what is visible; validate in Rich Results Test and the Schema Markup Validator)
- **Home:** `WebSite` (name, url) + `Store` (also `LocalBusiness`): name, url, logo, image, telephone, email, `address` (PostalAddress with streetAddress, addressLocality, addressRegion, postalCode, addressCountry IN), `geo`, `openingHoursSpecification`, `priceRange`, `areaServed` (India), `sameAs` (social + Google Business Profile URL), `hasMerchantReturnPolicy` only if config has it.
- **Category / Product:** `BreadcrumbList`.
- **Product:** `Product` with name, description, image[], brand, `offers[]` one `Offer` per active SKU: sku (sku_code), name ("{Name} {pack}"), `price` as decimal string from paise (e.g. "120.00"), `priceCurrency: "INR"`, `availability` InStock / OutOfStock (from stock), `itemCondition: NewCondition`, `url`, optional `shippingDetails` (`OfferShippingDetails`, destination country IN, handling/transit time ranges from config) and `hasMerchantReturnPolicy`. Retail price only. `aggregateRating`/`review` ONLY if `config.reviews` has real entries (default none). `isVariantOf` not needed.
- **FAQ:** `FAQPage` on `/faq` and product FAQ blocks, only when the Q&A is visible on the page. (Google shows FAQ rich results rarely; the Q&A text still helps search and AI answers.)
- No `Organization` duplicates; no `AggregateRating` invented; no GSTIN in JSON-LD.

## F6 GEO content rules (so people and AI assistants can quote you correctly)
1. Lead every page with a plain answer: what it is, who it is for, where you deliver, in the first 2 sentences.
2. Use consistent names for the brand, products and pack sizes everywhere (entity clarity). NAP (name, address, phone) identical across site, JSON-LD and Google Business Profile.
3. State facts with units: "200 g", "best before 90 days from packing", "ships to all states in India, dispatch in 2 working days".
4. Question-style headings on FAQ ("How long do these namkeens stay fresh?") with direct answers.
5. Visible "Last updated" date on policy and FAQ pages.
6. `/about` states real facts only (location, what you make/sell, FSSAI, coverage). If the client has no story yet, show only the facts. Never write "trusted by thousands" or similar.
7. Tables for pack/price comparisons (machine-readable), lists for ingredients and allergens.
8. Internal links: product → category → home; related products; footer links to every policy, FAQ, wholesale.
9. Write each product description in the owner's data fields (ingredients, shelf life, taste notes). The template fills gaps; no filler copy.

## F7 Sitemap, llms.txt, images
- `sitemap.xml`: indexable routes only, absolute URLs, `lastmod` from product/category updatedAt (IST→UTC ISO), max 50k URLs (fine). Product images may be listed with `image:image` entries (optional flag).
- `llms.txt` (optional `features.llmsTxt`, default on): plain text, brand one-liner, then links with one-line descriptions to the key pages. It is cheap and harmless; do not claim it affects rankings.
- Image SEO: descriptive file names, meaningful alt text, explicit width/height, WebP, hero not lazy.

## F8 Validation
`/dev/seo` inspector + `seo.test.ts` (P8). After export, run the real tools: Rich Results Test, Schema Markup Validator, `curl -A "OAI-SearchBot" <url>` and view the raw HTML for facts, Search Console URL Inspection.

## F9 After launch (hand to the client in handoff.md)
Verify the domain in Google Search Console, submit `sitemap.xml`, claim and complete the Google Business Profile (same NAP, hours, products, link to the store), keep GA4 linked. Optional add-ons: Google Merchant Center free listings from a product feed, ongoing SEO content, monthly reporting.

---

# SECTION G — ANALYTICS + CONSENT SPEC
## G1 Consent
Essential storage (cart, checkout draft, language, consent choice) needs no consent. Analytics does. `consent.v1 = {analytics:boolean, ts, version}` in localStorage (try/catch). Banner: bottom, non-blocking, two equal buttons "Accept analytics" / "Reject", link to Privacy, reopened from footer "Cookie settings". No banner when no GA id. Reject or no answer = nothing loads. Copy is marked "client to confirm with their adviser (DPDP)".
## G2 Loader
`track.ts` exposes `track(name, params)`. It queues events, loads gtag only after consent and a configured id, then flushes. Admin routes never track. Dev inspector logs every call, sent or dropped.
## G3 Events (GA4 names, money converted paise→rupees decimal ONLY here via `paiseToRupees()`, the single allowed exception to the no-floats rule)
| Event | When | Key params (no PII) |
|---|---|---|
| view_item_list / select_item | shop, category, related | item_list_name, items[] |
| view_item | product page | item_id (sku_code), item_name, item_variant (pack), price, currency INR |
| search | shop search (debounced, 3+ chars) | search_term |
| add_to_cart / remove_from_cart | cart changes | items[], value |
| view_cart | cart page | value, items[] |
| begin_checkout | checkout opens | value, items[], coupon |
| add_shipping_info | mode chosen | shipping_tier = local \| courier \| pickup |
| add_payment_info | pay clicked | payment_type = online \| cod |
| purchase | order first seen as paid, once | transaction_id (order code), value, tax, shipping, currency, coupon, items[] |
| generate_lead | wholesale register / quote request | lead_type |
| login | OTP success (buyer) | method = email_otp |
| click_contact | call, whatsapp, email, directions | method, context (home, product, cart, order, track, wholesale, footer, widget) |
| click_social | instagram, facebook, youtube, x, linkedin, google | platform |
| pincode_check | serviceability check | result = local \| courier \| none (never the pincode) |
| exception | ErrorBoundary | description (error code only), fatal |
## G4 Rules
PII guard drops any param whose key matches name|phone|email|address|gstin|pincode|otp. `purchase` de-dup via a localStorage set of sent order codes. UTM `utm_source/medium/campaign` and `gclid` captured first-touch in sessionStorage and stored on the order as `attribution` (for the owner's reports), not sent to GA by us. Wholesale buyers' prices never go to analytics.

---

# SECTION H — BOUNDARY SIMULATOR + QA
## H1 `/dev/sim` toggles (zustand `devSim`, read by the mock API; persists only in memory)
latency range · failRate % · stockRace (next order create loses the last pack) · priceChange (bump a SKU price between cart and pay) · shopCloseMidCheckout · webhookLate (seconds) · webhookDuplicate · amountMismatch · paymentFail · emailFail · sessionExpired (next admin call 401) · offline (simulate navigator.onLine=false) · storageBlocked (localStorage throws) · gpsDenied · slowImages · staleCatalog (serve 5-min old catalog) · invalidConfig (reload with a broken config) · clockOffset (shift `now` to test IST midnight and cut-offs).
## H2 Scenarios (each needs a pass/fail in P9; Row = master-plan Part E test id)
| # | Row | Trigger | Expected frontend behaviour |
|---|---|---|---|
| 1 | 5 | stockRace on, place order for last pack | Order fails with OUT_OF_STOCK; cart keeps other lines; message names the item; offers similar items; no charge attempted |
| 2 | 9 | archive a SKU while it is in the cart | On next quote the line is removed with a banner "1 item is no longer available" |
| 3 | 10 | priceChange on | Cart shows "Price updated" chip; checkout shows the new total BEFORE paying; never charges the old price |
| 4 | 14 | shopCloseMidCheckout | Pay button disabled with the reason and reopen time; draft preserved |
| 5 | 24 | webhookLate 20 s | Order page shows "confirming your payment", polls, then flips to Paid; never offers Pay again |
| 6 | 23 | webhookDuplicate | Order ends Paid exactly once; one confirmation email; one purchase event |
| 7 | 25 | amountMismatch | Customer sees "verifying"; admin sees flagged order, not auto-accepted |
| 8 | 19-20 | paymentFail, then dismiss the modal | Same order, retry works; dismiss leaves pending_payment with Resume |
| 9 | 37 | offline during checkout | Clear offline message; reconnect does not duplicate the order (same Idempotency-Key) |
| 10 | 38 | double-tap Pay / refresh after pay | One order; back button does not resubmit |
| 11 | 28-30 | sessionExpired in admin | Form data kept, login with next, back to the same page |
| 12 | 31 | emailFail | Order succeeds; admin shows Email failed + Retry |
| 13 | 32 | admin tab hidden then visible | Polling pauses and resumes; new order alert fires; no missed order |
| 14 | 12 | gpsDenied | Manual pincode path works; no dead end |
| 15 | 42 | clockOffset to 23:59 and 00:01 IST | Reports, dispatch date and "today" use IST |
| 16 | 46 | name = `<img onerror=alert(1)>`, notes with HTML | Rendered as text everywhere (cart, order, invoice, admin, emails) |
| 17 | 56-57 | 320 px, slowImages | No horizontal scroll; text usable before images |
| 18 | 58-59 | `?client=demo`; invalidConfig | Full rebrand with zero code change; broken config shows boot error |
| 19 | 60 | call every illegal status transition | Rejected with a clear error |
| 20 | 62 | unapproved buyer inspects DOM and network | No wholesale price anywhere |
| 21 | 63-64 | MOQ-1 / MOQ, tier boundary, 499/500/501 g | Correct error / price / fee |
| 22 | 65-66 | same-state vs other-state, mixed GST | CGST+SGST vs IGST; totals tie to the paisa |
| 23 | 67 | CSV with bad rows, duplicates, negative stock | Dry-run lists errors; nothing imported partially |
| 24 | 68 | edit a SKU code used by an order | Blocked; archive + create new |
| 25 | 71 | non-serviceable pincode | Plain message + phone/WhatsApp |
| 26 | 72 | bad GSTIN (length, checksum, state mismatch) | Rejected inline |
| 27 | 73 | archived SKU in a cart | Removed with message |
| 28 | 36 | (PWA on) deploy new version | Update banner, no stale shell |
| 29 | F | view-source of a prerendered product page | Title, canonical, JSON-LD and Quick facts present without JS; no wholesale data |
| 30 | G | consent Reject / no answer | Zero third-party analytics requests |
## H3 Manual QA matrix
Viewports 320, 360, 375, 414, 768, 1024, 1280 (portrait + landscape). Throttle: Fast 3G + 4× CPU. Keyboard-only run: browse → add → checkout → pay → track, and admin: login → mark shipped. Screen reader (TalkBack) run of the same. 200% zoom. Reduced motion on. Print preview of invoice, pick list, 4×6 label, 58/80 mm slip. Language switch (te falls back to en). Storage blocked. Each defect gets a line in `docs/audit.md`.
## H4 Prompt templates for AI Studio
- **Drift check:** `Compare the code to Section A rules 1–22. List violations only, with file and line. Do not change anything yet.`
- **Fix-only:** `Fix only these items: <list>. Do not refactor or restyle anything else. After the fix, re-run the Accept list for the current prompt and report.`
- **Regression guard:** `Before changing anything, run the quote test cases and the route smoke test (every route resolves, guards redirect correctly). After the change, run them again and show both results.`
- **Continue (long outputs):** `Continue from the last file you wrote. Output the remaining files only, same format.`
- **Rollback:** `Revert to the last exported commit state for <path> and re-apply only <change>.`

---

# SECTION I — HANDOFF, CONTRACT, ENV, HEADERS
## I1 `docs/api-contract.md` must contain
Every endpoint from P1 item 5 as a table (method, path, auth: public | buyer | admin, request JSON + Zod name, success JSON example, error codes), the common error shape `{ "error": { "code", "message", "field?", "requestId" } }`, status codes per endpoint, headers (`Idempotency-Key`, `Retry-After`, `Cache-Control` per route: catalog ≤ 60 s public, orders/admin/payments `no-store`), pagination and filters on admin lists, rate-limit rules (orders per IP/phone, OTP per email/IP), webhook endpoint spec (raw-body HMAC, `x-razorpay-event-id` dedupe, 5 s response), the SEO endpoints the Worker will serve (`/robots.txt`, `/sitemap.xml`, `/llms.txt`, HTML injection contract), and the status codes in Section E.
## I2 `.env.example` (public values only)
```
VITE_API_BASE=/api
VITE_CLIENT_ID=default
VITE_SITE_URL=https://example.com
VITE_TURNSTILE_SITE_KEY=
VITE_RAZORPAY_KEY_ID=
VITE_GA4_ID=
VITE_ENABLE_DEV=0
```
No secrets in this file or anywhere in the frontend.
## I3 `public/_headers` (Workers Static Assets). Experience layer: self-host the GLB and the Draco/meshopt decoders under same-origin paths (no external decoder URLs); WebAssembly decoders may need `'wasm-unsafe-eval'` in `script-src`, confirm in the console and add only if required. Starting point, confirm every origin against Razorpay, Cloudflare Turnstile and Google documentation, then fix any console CSP violations in the real-integration tests
```
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(self)
  Content-Security-Policy: default-src 'self'; script-src 'self' https://checkout.razorpay.com https://challenges.cloudflare.com https://www.googletagmanager.com; frame-src https://api.razorpay.com https://checkout.razorpay.com https://challenges.cloudflare.com; connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://www.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; base-uri 'self'; form-action 'self'; object-src 'none'; frame-ancestors 'none'
/assets/*
  Cache-Control: public, max-age=31536000, immutable
```
Enable `Strict-Transport-Security` at go-live once HTTPS is confirmed (at the Cloudflare edge or here). If `features.pwa`, add `/sw.js` with `Cache-Control: no-cache`. Prototype exception: Google Fonts may load from Google; production self-hosts fonts.
## I4 Mock → real replacement table (`docs/handoff.md` must list every row with status)
| Mock in prototype | Real replacement | Where it lives |
|---|---|---|
| `src/api/mock/*` in-memory DB | Hono routes + D1 + Drizzle | Worker |
| `src/api/client.ts` mock adapter | `fetch('/api/...')` implementation | frontend, the only file that changes |
| Mock reservations (setInterval) | Reservation rows + cron release | Worker cron |
| OTP code 123456 | Real email OTP (hashed, expiry, attempts) | Worker + email provider |
| `TurnstileWidget` mock | Real widget + Siteverify server-side | frontend + Worker |
| `RazorpayCheckoutMock` | Checkout.js + server order + callback HMAC + webhook + reconcile | frontend + Worker |
| Email outbox | `EmailProvider` (Resend default, Brevo backup, Cloudflare to owner) | Worker |
| Image upload (canvas resize, in-memory) | Signed upload to R2 | Worker + R2 |
| CSV import (in-memory) | Chunked server import with the same dry-run contract | Worker |
| Prerender script | Worker HTMLRewriter using `seo/render.ts` | Worker |
| Analytics no-op without id | GA4 with real id | frontend config |
| Courier tracking links (templates) | Optional courier API (add-on) | Worker |
## I5 `docs/data-model.md`
Entities with fields, types, constraints and indexes: products, skus, price_tiers, categories, slug_history, customers (buyer_type, gstin, approved_at), orders (with mode, buyer_type, place_of_supply, cgst/sgst/igst, courier, tracking, pay_by, attribution), order_items (snapshots: sku_code, hsn, gst_rate, weight, price), payments, webhook_events (event_id PK), reservations (expires_at index), shipping_rates, zones, coupons, quote_requests, email_log, audit_log, price_log, settings, otp. State which fields are public, buyer-only, or admin-only.
## I6 Hard NOs for AI Studio
No backend code. No real keys or secrets. No new dependencies without asking (list any added), except `gsap`, `@gsap/react` and `three` (plus `@types/three`) for Section M, pinned to exact versions that are at least 14 days old and listed with their gz size in docs/handoff.md. Dev-only tooling is allowed as `devDependencies` and never ships to production: `typescript`, `eslint` + `typescript-eslint`, `prettier`, `vitest`, `sharp` (image script, run locally), `@playwright/test` (e2e, run locally); list them in docs/handoff.md. No hotlinked stock photos. No editing token values from A4. No analytics before consent. No wholesale data in public output. No deleting dev tools from the prototype (they are excluded at build). No silent fallbacks that hide an error. No UI kit, no component library, no CSS-in-JS, no extra font families beyond A5, no extra animation library beyond `motion`.
## I7 Definition of Done (frontend)
All prompts P1–P5, P7, P7B, P7C (only if the experience flag is on), P8, P9 accepted (P6 only if bought); H2 scenarios 1–30 pass; `/dev/seo` green; vitest green; `npm run build:seo` clean; docs present and accurate; `docs/audit.md` has evidence per check; mock→real table complete; open "client to confirm" items listed for the client call; Section K6 checklist all pass; `docs/swap-checklist.md` exists; `docs/design-plan.md` exists and its generic-defaults review (K1) is filled in; the assumptions log in `docs/progress.md` is complete.

---

# SECTION J — UI/UX DIRECTION, SCREEN LAYOUTS, CONTENT DESIGN, UX ACCEPTANCE
Sections A–I define system and behaviour. Section J defines how it should LOOK and FEEL, so the result is designed, not templated. Where J and an earlier visual line disagree, J wins.

## J1 Design direction
- **Feel:** warm, appetising, trustworthy, a modern Indian kirana/sweet-shop counter, not a tech start-up. Calm, generous whitespace, strong product focus. Words to design by: *fresh, honest, family, crisp, premium-but-affordable*.
- **Signature details (use consistently, they make it recognisable):** (1) pack-size chips styled like small paper labels (pill, 1 px border, selected = filled `--ink`), (2) price block with a quiet MRP strike and a "You save ₹X" line in `--success`, (3) section titles in Fraunces with a short `--accent` underline bar (24×3 px), once per page region, (4) product cards with 4:5 image, soft 12 px radius, no heavy shadows.
- **Imagery rules:** real product photography only. Photo style: overhead or 45° on a plain warm surface, natural soft light, consistent crop and background across all products, 4:5 for cards, 1:1 for gallery, 16:9 or 4:3 for hero, plus 2–3 lifestyle shots (serving, packing, shop front). No stock-photo people, no AI faces, no collages. Placeholders until photos arrive: a neutral `--surface-2` box with the product name and a pack silhouette icon, never random photos.
- **Layout language:** 4/8 pt grid, 16 px gutters on mobile, one clear primary action per view, content width ≤ 1200, generous 48–64 px vertical rhythm between sections on desktop and 32 px on mobile. Left-aligned text; avoid centring long copy.
- **Density:** shop = comfortable; admin = compact but with 44 px tap targets.
- **Colour use:** follow A4 (60/30/10). Accent only once per screen region. Photos carry the colour; UI stays quiet.
- **Do not:** copy another brand's layout, use gradients as decoration, add decorative blobs, patterns or textures, or put text on busy photos without a scrim.

## J2 Screen layouts (mobile first; these are the structure, not final pixels)
**Home, first screen at 375×667 must show:** brand/logo, one H1, one primary CTA, and the top of a product image.
```
[logo]                    [search] [cart 2]
Free delivery above ₹499 · Ships across India        (announcement, dismissible)
H1 in Fraunces, max 2 lines
One-line sub, 16 px
[ Shop now ]   Wholesale enquiries ->
[ hero image 4:3, fetchpriority high ]
-- below the fold: categories (2x2) / best sellers (scroll-snap) / how ordering works / delivery / wholesale / contact
```
**Shop:** sticky chips row under header; result count + sort/filter button on one line; 2-column grid; sticky mini cart bar when cart has items.
**Product (mobile):** swipe gallery 1:1 with dots → name + VegMark → pack chips → PriceBlock → delivery check (pincode) → qty stepper → accordions (Description, Ingredients, Allergens, Storage, Legal info) → related. Sticky bottom bar: price + "Add ₹X". Desktop: gallery left (sticky), details right.
**Cart:** lines → coupon → shipping estimate (pincode inline) → totals box → sticky "Checkout ₹X" bar. Desktop: totals in a right column.
**Checkout:** one page, three steps (Contact, Delivery, Review & pay) as accordions on mobile with a progress label "Step 2 of 3"; desktop two columns with a sticky order summary. Errors appear inline under the field and in a summary at the top (focus moves to it on submit).
**Order status / success:** top banner with the state in words ("Order placed. We are packing it."), order code with copy button, timeline, "What happens next" (3 short lines with dates), items and totals, address, invoice button, contact actions.
**Admin (≥1024):** orders as master-detail (list left ~40%, detail right); below 1024 separate pages. Top bar: shop switch, sound indicator, last-updated. Filters as tabs with counts. Row = code, time ago, total, mode, payment badge, status pill; big action button at the right.
**Wholesale pages:** plain, factual, form-first. No hero imagery needed.

## J3 Navigation + information architecture
- **Header, mobile:** logo, search icon (opens a full-width search sheet), cart with count badge. Bottom nav: Home, Shop, Cart, Track, More (More = Wholesale, About, FAQ, Contact, policies, language).
- **Header, desktop:** logo, links (Shop, Categories ▾, Wholesale, About, Contact), search field, cart. Categories menu is a simple list, not a mega-menu.
- **Search:** debounced suggestions (products and categories), recent searches in localStorage (try/catch), no-results state with popular categories and a contact link.
- **Footer (4 blocks):** Shop (categories), Help (FAQ, Shipping, Refund, Track order), Company (About, Contact, Wholesale), Legal and trust (FSSAI, GSTIN, legal name, address, payment methods text). Footer has the cookie-settings link.
- **Breadcrumbs** on category and product pages. Back-button behaviour must restore scroll position and filters.

## J4 Trust and conversion UX (no dark patterns)
- Show delivery estimate, shipping rule and returns line near the price on the product page.
- Show FSSAI, MRP, net quantity and best-before (Legal Metrology) on the product page.
- Payment trust: "Secure payment by Razorpay" text with accepted methods; never display a logo or claim you are not entitled to.
- Scarcity only if real: "Only 3 left" appears only when `stock ≤ lowStockAt`. No fake countdowns, no fake visitors, no pre-ticked upsells, no hidden fees: shipping and tax lines visible before the pay button.
- Make the next step obvious on every screen and give a human fallback (phone/WhatsApp) wherever the user can get stuck.

## J5 Content design
- Tone: friendly, plain, specific. Short sentences. No hype words. Hindi/Telugu words only if the client supplies them.
- Formats: ₹1,23,456 (Indian grouping), dates "25 Nov 2026", time "6:30 pm IST", weights "200 g" and "1 kg" with a non-breaking space, pincode as 6 digits, phone as +91 98765 43210.
| Moment | Copy |
|---|---|
| Add button | Add to cart |
| Added toast | Added to cart. Undo |
| Cart empty | Your cart is empty. Shop now |
| Pincode ok | We deliver here. Dispatch in 2 working days |
| Pincode not served | We don't deliver to this pincode yet. Call us on {phone} |
| Sold out | Sold out. See similar items |
| Shop closed | We are closed now. Reopens {time}. You can still browse |
| Price changed | Price updated to ₹{x} |
| Pay button | Pay ₹{total} |
| Payment pending | We are confirming your payment. Please don't pay again |
| Payment failed | Payment didn't go through. Try again or choose another method |
| Order placed | Order placed. We'll email you when it ships |
| Wholesale pending | Thanks. We'll review your details and email you |
| Offline | You are offline. Call us on {phone} to order |
| Generic error | Something went wrong on our side. Try again, or call {phone} |
| Form error | Enter a 10-digit mobile number starting with 6, 7, 8 or 9 |

## J6 UX acceptance checklist (run per phase, record in docs/progress.md)
For every screen at 375, 768 and 1280 px:
1. **5-second test:** a stranger can say what the page is for and what to press next.
2. **Hierarchy:** one H1, one primary button, secondary actions visibly quieter.
3. **Alignment and spacing:** everything on the 4/8 grid; consistent gutters; no orphan or cramped elements.
4. **Type:** sizes from the scale only; line length 60–70 ch; no text below 12 px; prices tabular.
5. **Colour and contrast:** AA everywhere; accent not used as text on light; status never by colour alone.
6. **Touch:** targets ≥ 44 px, thumb-reachable primary actions on mobile, no hover-only controls.
7. **States:** loading, empty, error, success, sold-out, offline all designed.
8. **Images:** fixed ratio, no layout shift, graceful failure, alt text.
9. **Consistency:** the same component for the same job; no one-off buttons or colours.
10. **Forms:** visible labels, correct keyboards (`inputmode`), blur-first validation, helpful errors, no data loss on refresh.
11. **Motion:** only tokens from A9; reduced motion works; nothing blocks input.
12. **Heuristic scan (Nielsen):** visibility of status, match with real world, user control (undo), consistency, error prevention, recognition over recall, flexibility, minimal design, error recovery, help.

## J7 Visual review loop (how the UI actually gets good)
After each phase: capture screenshots of every changed screen at 375, 768 and 1280 px; run J6 and K6; list the 10 worst issues; fix them; re-capture. If AI Studio cannot take or read screenshots, say so in docs/progress.md, do the review from the rendered DOM and computed styles, and mark the visual checks "needs human review". The user may send the screenshots to a separate Claude session for a second review; apply its fix list as a Fix-only prompt (H4). Never claim a visual check passed that you did not see.

## J8 Usability test (after the build, 5 people, 20 minutes each)
Tasks: (1) find and add 500 g of a snack to the cart; (2) check if delivery is possible to your pincode; (3) buy it with a test payment; (4) find where your order is; (5) as a shop owner, register for wholesale prices. Record time, errors, and one quote each. Success: ≥ 4 of 5 complete each task unaided. Fix anything two or more people stumble on.

## J9 Assets the client must provide (put in the contract)
Logo (SVG/PNG, light + dark bg), brand colours, per-SKU product photos (min 1600 px, consistent background), 2–3 lifestyle photos, shop front photo, FSSAI label details, the FAQ answers, About-page facts, and a returns/damage policy. Without real photos the site will look plain; budget a half-day photo session or a photographer add-on.

---

# SECTION K — DESIGN CRAFT RULES (merged from UI/UX Pro Max, Frontend Design, Impeccable, better-ui, better-typography, better-colors, WCAG 2.2, mobile-native, Emil Kowalski, BJNEXUS rules, SEO and Core Web Vitals)
Applies to every phase. Token VALUES stay as in A4. K adds how to design, what to refuse and what to verify.

## K1 Design process: plan, review against defaults, then build
Write `docs/design-plan.md` in P1 and update it in P7B. Contents:
1. **Surface modes** (decides how bold to be). Persuade = home hero and wholesale landing: committed and specific. Operate = shop, product, cart, checkout, order status, account, ALL admin: scanability, consistency and familiar patterns beat expression; brand lives in precise details. Read = policies, FAQ, About: structure for comprehension, 60 to 70 ch.
2. **Plan** (short): colour roles (from A4, 4 to 6 named values with roles), type roles (A5), layout concept in one sentence plus an ASCII wireframe each for home, product page and checkout at 375 px, alignment rule (left-aligned; centre only short labels), and 3 to 5 principles for this product.
3. **Memorable detail (spend boldness in ONE place):** per-pack unit price on pack chips ("₹X per 100 g", informational, from a pure `unitPricePer100gPaise(retailPaise, netWeightG)` in `shared/money.ts`, rounded half-up to whole paise, never a total; mark "client to confirm" in handoff). Everything around it stays quiet.
4. **Generic-defaults review.** The brief pins a warm cream background, a serif display face and a terracotta primary. Those are also the most common default look of generated sites, so colour alone cannot make this one distinctive. Distinctiveness must come from: real product photography, the paper-label pack chips, the per-100 g line, the MRP strike with "You save", tight task-first layouts, and specific copy. For each screen write one line: "what would a template do here, and what do we do instead". Also reject, in the plan, any of these defaults unless this brief earns it: identical rounded cards for everything, one radius and one soft shadow on everything, ALL-CAPS tracked eyebrow above headings, "A · B · C" middle-dot meta strings, "WORD — fragment" labels, "→" appended to every button, tinted near-black as pure black, monospace for small labels, numbered 01/02/03 markers on non-sequences.
5. **Three dials, stated before coding** (1 to 10): shop screens VARIANCE 4, MOTION 3, DENSITY 4; admin VARIANCE 2, MOTION 1, DENSITY 7; home hero VARIANCE 6, MOTION 4. A customer may change them in its concept sheet (`docs/swap-checklist.md`).
6. Then build. If any part of the plan reads like the default you would produce for any food shop, revise it first and note what changed.

## K2 Rules by priority (UI/UX Pro Max order; fix higher priorities first)
**1 Accessibility (critical)**
- Contrast 4.5:1 text, 3:1 large text and UI parts (A4 already verified; re-measure the RENDERED pair on photos, banners, disabled and selected states). On a coloured surface tint secondary text from that hue, never plain grey.
- Focus not obscured (WCAG 2.2): sticky header and cart bar must never hide the focused control. Set `scroll-padding-top` = header height and `scroll-padding-bottom` = cart bar + bottom nav height + safe area; Tab through every page to prove it.
- Target size: 44×44 px minimum (WCAG minimum is 24×24; we exceed it), 8 px gap between targets.
- Consistent help: `<ContactActions/>` appears in the same relative place and order on every page that has it.
- Redundant entry: never ask for the same data twice in checkout; autofill attributes (`autocomplete="name|tel|email|street-address|postal-code"`); keep the draft on refresh.
- Accessible authentication: OTP input has `autocomplete="one-time-code"`, allows paste, shows resend with a timer, and needs no puzzle or memory test.
- Forms: visible labels; error under the field linked by `aria-describedby`; after a failed submit focus the error summary at the top with links to each field; inline errors stay. `aria-live` for field errors.
- Live regions: cart changes announce a full phrase ("Cart, 3 items, ₹459") politely; toasts never steal focus.
- Gallery and carousels: visible previous/next buttons (no swipe-only), no autoplay, visible position text ("2 of 5"). Drag-to-dismiss on sheets also has a Close button.
- Route change: move focus to the main heading or main landmark and update document title.
- Icon-only controls have an accessible name; decorative icons beside text are `aria-hidden`. Status never by colour alone.
**2 Touch and interaction (critical)**
- Press feedback within 100 ms: scale 0.96 on buttons, chips, steppers and icon buttons; 0.98 on large cards; never below 0.96; disabled elements excluded (`:not(:disabled)`).
- All `:hover` styles inside `@media (hover:hover) and (pointer:fine)`. Nothing is hover-only.
- `-webkit-tap-highlight-color: transparent`; `touch-action: manipulation` on controls; `user-select:none` only on controls, never on body text.
- Loading button: disabled + inline spinner, label kept, width locked. Destructive actions confirm or offer Undo.
**3 Performance (high)**
- Reserve space for images, banners and async content (CLS ≤ 0.1): `aspect-ratio`, width and height, skeletons sized like the content. WebP/AVIF with srcset, lazy-load below the fold, hero image `fetchpriority="high"` and not lazy.
- Debounce search 250 ms. Virtualise any list over 50 rows (admin orders, products). Third-party scripts async and only after consent.
**4 Style (high)**
- One primary button per view; secondary and tertiary visibly quieter. One icon family, one stroke width (lucide 1.75), `currentColor` only (no hard-coded fills in SVG).
- Elevation scale only (`--sh-1`, `--sh-2`): shadows for elevation, borders for structure. Concentric radius: outer radius = inner radius + padding (card 12 with 4 px padding around an 8 px image corner). Images get a 1 px outline `rgb(0 0 0 / .10)` so pale photos do not bleed into the page.
- Optical alignment: icons beside text are nudged by eye where geometry looks off; play/arrow glyphs are optically centred.
**5 Layout (high)**
- Mobile first, breakpoints from A4. `100dvh` for app shells and bottom-pinned UI, `100svh` for the home hero. Fixed bars reserve space under them (`fixed-element-offset`) and add `env(safe-area-inset-bottom)`.
- Body measure 60 to 70 ch (mobile 35 to 60). Wrap chips and labels before shrinking them; unavoidable truncation is disclosed (expand or full text on the product page).
- Landscape stays usable. No nested scroll areas except inside sheets, menus and dialogs (`overscroll-behavior: contain`).
**6 Typography and colour (medium)**
- Faces and weights loaded must match the weights used (Fraunces 600/700, DM Sans 400/500/700). Use `font-weight` and `font-optical-sizing:auto`, not `font-variation-settings`. Unitless `line-height` (body 1.5, headings 1.15, anything that wraps ≥ 1.4). `letter-spacing` in `em`. Body size in `rem`. No weight below 400 under 18 px.
- `font-variant-numeric: tabular-nums` on prices, quantities, totals, timers, order codes, table columns. `text-wrap: balance` on headings, `pretty` on paragraphs, never `balance` on paragraphs. `text-align:start`, never justified.
- Typographic punctuation in rendered strings: `…` not `...`, en dash for ranges ("2–3 days"), proper quotes and apostrophes, ₹ before the number, non-breaking space between number and unit ("200 g").
- Wrap mixed-direction user values (names, phone numbers, URLs) in `<bdi>`. Telugu/Hindi get the A5 fallback stack and +0.1 line-height.
- Truncate only with a way back (full text visible somewhere). Font smoothing set once on the root.
- Colour: semantic tokens only in components (no raw hex). One colour, one meaning (green = success/in stock, red = error/sold out, amber = notice; never reuse them as decoration). Primary fills exactly one action per view. Accent never carries text on light.
**7 Animation (medium)** (A9 is the source of truth; these are extra)
- State changes use transitions on named properties; keyframes only for entrances. Never `transition: all`. Spring `bounce` is 0 (no overshoot) except where A9 gives stiffness/damping. State animations are skipped on first render. Contextual icons (add → check, menu → close) cross-fade with opacity and a small scale/blur-free transform.
- Rapid taps cancel and replace the previous micro-interaction and set the final state explicitly; correctness never depends on an animation-end event.
- Motion needs a cause (user action or a state change). One authored moment per page; no identical fade-slide entrance on every section; no hover transition on every card.
**8 Forms and feedback (medium)**
- Validate on blur, not on every keystroke. Errors say cause + fix. Multi-step flow shows "Step 2 of 3" and allows Back without losing data. Helper text is persistent for complex fields (GSTIN, pincode). Disabled uses reduced opacity + `aria-disabled`/`disabled` and an explanation where it blocks the main path; read-only looks different from disabled. Toasts auto-dismiss in 4 to 5 s.
**9 Navigation (high)**
- Bottom nav max 5 items, icon + label, current item clearly marked (colour + weight + indicator, not colour alone). Same placement on every page. Back restores scroll, filters and input. Every key screen has a real URL (deep link). Search is reachable in one tap from every customer page. Breadcrumbs on category and product pages. Unavailable destinations explain why instead of vanishing. Modals are not used for primary navigation; checkout and the pincode check are inline or in a sheet, not a modal.
**10 Data tables (admin)**
- Each table has a caption, `th scope`, sortable headers with `aria-sort`, and collapses to stacked cards under 768 px. Charts (reports) always have a table alternative and never rely on red/green alone.

## K3 Refuse list (craft bans; in addition to A10)
- No eyebrow/kicker label above a heading. No ALL-CAPS labels or tracked-out caps captions. Emphasis comes from weight or size, never from colouring or italicising one word in a headline.
- No section numbers (01/02/03) unless the content really is a sequence (checkout steps and "How ordering works" are sequences; categories and features are not).
- No same-size icon + heading + text card rows as page structure; no nested cards; no hero-metric block (big number + small label + stats).
- No coloured bar down one side of a rounded box (any border-left/inset-shadow/pseudo-element version). Use a full border, a tint, or a leading icon.
- No hard offset shadows (`4px 4px 0`), no zero-offset coloured glows, no gradient text, no glass or blur as decoration (blur only to dim the page behind a sheet).
- No monospace for small labels (only for order codes and real code/data). No "→" appended to every link/button. No "A · B · C" meta strings as a style.
- No Unicode glyphs or emoji standing in for icons. No geometric masks pretending to be photo cut-outs.
- No copy that sells instead of tells: no "Welcome to", "Elevate", "Seamless", "Unlock". Name things the way a shopper says them.
- Theme the browser's own surfaces from the palette: `::selection`, `caret-color`, `accent-color` on checkboxes and radios, `scrollbar-color`, `text-underline-offset`, link underline from the font, tabular numerals.

## K4 Mobile baseline (ship before the first component; test on a real mid-range Android phone over 4G, emulation cannot reproduce keyboard, safe areas, sticky hover or tap delay)
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
<meta name="theme-color" content="#FFF9F0">
```
Define `--header-h`, `--cartbar-h` and `--bottomnav-h` as layout variables set from the real element heights (0 when the element is absent); they are layout values, not colour/type tokens, so A4 stays untouched.
```css
html { -webkit-tap-highlight-color: transparent; -webkit-text-size-adjust: 100%; scroll-padding-top: var(--header-h); scroll-padding-bottom: calc(var(--cartbar-h) + var(--bottomnav-h) + env(safe-area-inset-bottom)); }
input, textarea, select { font-size: 16px; }              /* stops iOS zoom; never disable zoom */
button, a, [role="button"] { touch-action: manipulation; user-select: none; -webkit-user-select: none; }
.sheet, .dialog, .menu { overscroll-behavior: contain; }  /* not on html: the shop is a normal scrolling document */
.app-shell { min-height: 100dvh; } .home-hero { min-height: 100svh; }
.cartbar, .bottomnav { padding-bottom: env(safe-area-inset-bottom); }
@media (hover: hover) and (pointer: fine) { /* every :hover rule lives here */ }
.gesture-surface { touch-action: pan-y; }                 /* horizontal swipe gallery must not block vertical scroll */
```
Never ship: `user-scalable=no`, `maximum-scale=1`, ungated `:hover`, `100vh` on pinned UI, press feedback on `click` only, `user-select:none` on body.

## K5 Imagery and content (design content, not decoration)
- Real photography only (J1). The first screen shows the actual product within 1 viewport. Alt text describes the product ("Aloo Bhujia, 200 g pack"), not "image".
- Write from the shopper's side: "Delivery to 500081" not "Serviceability check". Active voice. An action keeps the same name through the flow ("Add to cart" → toast "Added to cart"; "Place order" → "Order placed"). Errors never apologise vaguely and always name the recovery. Empty states invite the next action.
- Sentence case everywhere except proper nouns. No filler, no exclamation marks.

## K6 Technical pre-delivery checklist (run with J6; record pass/fail per screen in docs/progress.md)
1. Keyboard: Tab order matches visual order; every control reachable; focus ring ≥ 3 px visible on every background; focus never hidden by sticky bars.
2. Screen reader names: every icon button, form field, status pill and live region has a sensible name.
3. 200% zoom and 320 px width: no loss of content, no horizontal scroll. Landscape works.
4. Reduced motion on: no springs, no hero sequence, no haptics, opacity-only.
5. Rendered contrast measured for text on photos (scrim), disabled, selected, sold-out, banners.
6. No layout shift when: images load, fonts swap, banners appear, consent bar appears, toasts appear.
7. Every async view shows loading, empty, error, success. Offline shows the offline page with a Call button.
8. Touch targets ≥ 44 px with ≥ 8 px gaps; primary action reachable by thumb on 375 px.
9. Only A9 tokens used for motion; only `transform` and `opacity` animated; no `transition: all`; no `will-change` at rest.
10. No raw hex or px font sizes in components (tokens only); one icon family; `currentColor` icons.
11. Forms: correct `inputmode`/`autocomplete`, blur validation, error summary focus, draft kept on refresh.
12. Hover rules gated by `(hover:hover) and (pointer:fine)`; no sticky hover after tap.
13. Fixed bars have safe-area padding; keyboard open does not hide the focused input (`dvh`, `interactive-widget`).
14. Copy: sentence case, verb-first buttons with exact amounts, no banned phrases (K3, K5).
15. The one goal (order, call or WhatsApp) is findable within 5 seconds on a 375 px screen; phone, WhatsApp, address, hours and map come from config and are tappable.
16. Content is visible by default: with JavaScript blocked the prerendered facts still show (no base `opacity:0` or hidden state that only JS reveals).
17. Stress test with worst-case data on every list, card, table and form: a 60-character product name, a 2× longer Telugu string, ₹9,99,999 total, 1 item and 99 items in cart, qty 99, missing image, zero stock, a 100-character address, an empty catalog. Nothing overflows, clips, overlaps or shifts.
18. Classify every failure found: **P0** blocks ordering, severe accessibility failure or deceptive proof; **P1** harms comprehension, trust, navigation or interaction; **P2** repeated generic pattern or inconsistency; **P3** minor polish. Fix P0 and P1 before moving on; fix P2 in P7B.

## K7 Self-review (end of P7B)
Removal test for every decorative or repeated element: what information, state, action or hierarchy does it provide? If none, remove it. If something real is lost, make the smallest correction inside the existing system instead of adding a new visual idea. Report the findings as one table `| Before | After | Why |` (rules you were tempted to break, and what you did), not as prose.
Look at each screen as a stranger would. Write the 5 most generic-looking things, remove or replace each with something specific to this shop, and remove one decorative element per screen (if a thing does not help someone order, cut it). Record the list in docs/design-plan.md.

## K8 Motion craft (Emil Kowalski, BJNEXUS motion rules, choreography, animation performance). A9 stays the source of tokens; these decide when and how.
1. **Frequency test before any animation.** Used many times a day or by keyboard → no animation (admin, search suggestions, filters, tab switching with the keyboard). Used occasionally (sheets, toasts, cart bar) → standard motion. Rare or first time (order placed, hero once per session) → may add delight. If removing it loses no meaning, remove it.
2. **Purpose.** Every animation must answer "why": spatial consistency, state change, feedback, or preventing a jarring jump. "It looks cool" is not a purpose.
3. **Curves and speed.** Ease-out for enter and exit, ease-in-out only for on-screen movement, linear only for constant progress. UI animations stay under 300 ms (the single hero entrance may run up to 700 ms total). Press feedback 100 to 160 ms.
4. **Origin.** Popovers and menus scale from their trigger; bottom sheets slide from the bottom edge; true modals stay centred.
5. **Choreography for the add-to-cart moment** (the one multi-part interaction): cast the elements (Add button → Stepper, CartBar, count badge, toast); they move together by default, overlap by at most 60 ms; the badge pulse is synced to the moment the bar settles; everything that is not part of the moment (prices, other lines, header) stays perfectly still; a rapid second tap cancels and replaces the first and sets the final state explicitly.
6. **Interruptible and non-blocking.** Nothing waits for an animation to finish; no animation moves a tap target while a finger is on it.
7. **Frame budget.** Only `transform` and `opacity` (compositor); the Experience layer (Section M) may also use `clip-path` masks and a WebGL canvas, under its own budgets. Never drive animation through React state per frame (use `m.*` and motion values or CSS). Do not animate a CSS custom property on a parent with many children (it restyles all of them). No blur, no `backdrop-filter` animation, no `box-shadow` animation. `will-change` only while animating and named. Pause offscreen loops. Verify with a 4× CPU slowdown trace on the sheet, the cart bar and route changes.
8. **Visible by default.** No base `opacity:0` that depends on JavaScript; entrances run from a `from` state and end visible; reveals use IntersectionObserver or `whileInView once`, never scroll handlers; max 3 revealed sections.
9. **Reduced motion.** Remove spatial movement, keep opacity or colour feedback; no springs, no haptics, no autoplay.
10. **Output.** After P7 list every animated element as `| Element | Trigger | Property | Token | Why |` and flag any row that fails 1 to 9.

## K9 SEO and performance cross-checks (SEO, Core Web Vitals and web-quality skills; Section F and P8 stay the source)
- Measure before optimising: Lighthouse mobile plus a performance trace on a throttled profile. In this prototype there is no field data, so report lab numbers only and write "field validation pending (Search Console, CrUX after launch)". Never promise rankings or rich results; say eligible and validated, with the Rich Results Test and Schema Markup Validator output.
- LCP: the home hero image and the product main image are preloaded or `fetchpriority="high"`, never lazy; fonts are subset and one is preloaded. Add a size-matched fallback font (`size-adjust`, `ascent-override`) so font swap causes no layout shift.
- INP ≤ 200 ms: no handler does heavy work synchronously; split tasks over 50 ms; debounce search; keep the quote call off the tap path (optimistic UI with Undo).
- CLS ≤ 0.1: every image, banner, consent bar, toast and skeleton reserves its space.
- Indexable URLs are lowercase, hyphenated, short and parameter-free; changed slugs 301 via `slug_history`. Internal links are real `<a href>` links so crawlers can follow them; every image has useful alt text; one H1 per page.
- The mobile checks from Google's audits are already in K2 (tap targets, 16 px text, no horizontal scroll, viewport meta).

---

# SECTION L — WORKING RULES (Karpathy guidelines, applied to this build)
Reduce the usual model mistakes: silent assumptions, over-building, drive-by edits, and "looks done" without proof.

## L1 Think before coding
State assumptions explicitly in the assumptions log in docs/progress.md (phase, assumption, why, what would change it). When two readings are possible, write both, pick the simpler one that satisfies this file, and continue. If something in this file contradicts itself, apply the precedence line at the top, log it, and continue; never stop to ask. Surface tradeoffs in one line in the log.

## L2 Simplicity first
Write the minimum code that meets the spec. No features, abstractions, options or config that this file does not call for (white-label config is called for; speculative flexibility is not). No error handling for impossible cases. If 200 lines can be 50, rewrite. Prefer the platform (CSS, semantic HTML, native inputs) over a library. List any new dependency with its gz size and reason (rule I6).

## L3 Surgical changes
After a phase is accepted, later phases touch only the files they must. Match the existing style; do not reformat or "improve" adjacent code; do not rename or move files without need. Remove only imports/variables/functions that YOUR change made unused. Mention unrelated problems in docs/progress.md instead of fixing them silently. Every changed line must trace to the current phase or a failed Accept line. Fix-only prompts (H4) change only what the fix needs.

## L4 Goal-driven execution
Turn each phase into verifiable goals before coding, for example: "1. Money helpers → verify: vitest cases for rounding and en-IN grouping pass. 2. Quote engine → verify: /dev/quote-cases all green. 3. Checkout → verify: double-tap creates one order." For pure logic (money, gst, quote, status machine, seo, PII guard) write the failing tests first, then the code. For a bug, write a test or a /dev/sim case that reproduces it, then fix. Loop until verified; report what was verified and what could not be verified in this preview.

---

# SECTION M — EXPERIENCE LAYER (Three.js + GSAP ScrollTrigger; merged from the Three.js, GSAP official, web3d-integration and BJNEXUS motion skills)
Purpose: give the front end a memorable first impression without slowing or endangering ordering. It is a lazy, device-gated, optional layer on Persuade pages. Everything else in this file still applies; M adds exceptions only where it says so.

## M1 Where it is allowed
- Allowed: home (`/`), and optionally `/about` and the `/wholesale` landing. One focal moment per page: EITHER the 3D hero object OR the masked text reveal as the hero moment, plus at most ONE pinned scroll story.
- Never: `/shop`, `/c/:slug`, `/p/:slug`, `/cart`, `/checkout`, `/order/*`, `/track`, `/account`, `/policies/*`, `/faq`, any `/admin/*`, `/dev/*` except `/dev/experience`. These are Operate/Read surfaces: no scroll-jacking, no smooth-scroll library, no pinned sections, no WebGL.
- Optional product-page 3D viewer is out of scope for v1 (list it in handoff as an add-on).

## M2 Loading, gating and fallbacks (the layer must never hurt the first paint)
1. **Static first.** The home page renders its complete static hero (poster image, H1, CTA, facts) with no experience code. That is the LCP element and the only thing crawlers and low-end phones need.
2. **Lazy load.** After first paint and `requestIdleCallback` (timeout 2 s), run `shouldLoadExperience(env)`; only if `load` is true, `import()` the experience chunks. Initial JS budget (≤ 170 KB gz) is unchanged. Experience budgets: GSAP core + ScrollTrigger + SplitText ≤ 55 KB gz; Three.js chunk ≤ 180 KB gz (import only what is used, no `three/examples` helpers beyond the GLB loader and the decoder); GLB ≤ 1.5 MB; textures ≤ 1024 px, WebP or KTX2; model ≤ 50,000 triangles; no more than 2 lights and no real-time shadows (use a baked or fake contact shadow).
3. **Gate (pure function, unit-tested, returns reasons).** Load only if ALL are true: no `prefers-reduced-motion: reduce`; not `navigator.connection.saveData`; effective connection type is 4g or unknown; `navigator.deviceMemory` ≥ 4 or unknown; `navigator.hardwareConcurrency` ≥ 4 or unknown; viewport width ≥ 360; WebGL2 context can be created; page is visible; the user has not chosen "Reduce effects" (footer switch, localStorage in try/catch); URL has no `?experience=off`.
4. **Adaptive quality.** Cap pixel ratio at 1.5 on touch devices and 2 on desktop. Measure the first 30 frames: average frame time above 24 ms → drop to pixel ratio 1; still above 24 ms after 60 frames → stop the loop, dispose everything and show the static poster for the rest of the session. `antialias:false` on touch devices; `powerPreference:'low-power'`.
5. **Fallback is the default design, not an error.** Gate false, chunk load error, GLB error, context loss (`webglcontextlost`) or timeout (> 6 s to first rendered frame) → keep the static poster, log via `logError()`, no visible error. The stacked story text is identical.
6. **Pause control.** A visible 44 px "Pause animation" / "Play animation" button near the canvas (WCAG 2.2.2). It stops the render loop and all auto-playing motion and is remembered for the session. Reduced motion starts paused.

## M3 Three.js rules (vanilla, no R3F)
- One renderer, one scene, one canvas, `aria-hidden="true"`, `pointer-events:none` unless the object is intentionally draggable (then a keyboard-reachable alternative is not needed because it is decorative; never put required content in the canvas).
- `renderer.outputColorSpace = SRGBColorSpace`; textures `colorSpace = SRGBColorSpace` (colour data only); tone mapping ACESFilmic; `renderer.setAnimationLoop` (not `requestAnimationFrame` by hand); use `THREE.Timer`/`Clock` for time-based motion, never frame-count motion.
- Create geometry, materials and textures ONCE outside the loop; never allocate objects inside the loop; reuse vectors.
- Handle resize with a `ResizeObserver` on the canvas container (update aspect and projection matrix, throttled). Pause the loop when the canvas is off-screen (IntersectionObserver) or the tab is hidden.
- Dispose everything on unmount and on fallback: geometries, materials, textures, render targets, the renderer (`renderer.dispose()` and `forceContextLoss()`), and remove listeners. `/dev/experience` must show geometries and textures return to 0.
- Motion of the object: slow idle rotation or a gentle pointer-follow tilt (max ±8°, eased), no more than one animated object, no particles, no post-processing, no custom shaders in v1. The object must be the REAL product or an ingredient from the client's world, never abstract floating shapes.
- Models come from Blender: export glTF/GLB with one material where possible, applied transforms, Draco or meshopt compression, power-of-two textures. A client without a model uses `hero:'text'` or `hero:'image'`. Do not fabricate a model.

## M4 GSAP + ScrollTrigger rules
- Install `gsap` and `@gsap/react`. Check the current GSAP licence terms on gsap.com at build time and note the result in docs/handoff.md. Register plugins once (`gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP)`).
- Always use the `useGSAP()` hook with a `scope` ref (it reverts animations and ScrollTriggers on unmount); animations created inside event handlers use `contextSafe`. Never create animations in render. Kill all ScrollTriggers on route change.
- Wrap in `gsap.matchMedia()`: `(prefers-reduced-motion: no-preference)` and `(min-width: 768px)` get the scroll story and reveals; everything else gets the stacked layout and a 200 ms opacity fade at most.
- **Content visible by default.** Add a `data-experience="on"` attribute to the root only AFTER the gate passes and the first frame is ready; initial CSS never hides content. Reveals use `from` states created by GSAP, `once: true`, `start: 'top 80%'`; never `opacity:0` in base CSS.
- Pinned story: ONE per page, `pin:true`, `scrub:1`, `end` ≤ `+=2000`, `anticipatePin:1`, `invalidateOnRefresh:true`, no nested pins, no horizontal scroll hijack. Keyboard users can Tab through all step content in DOM order; the pinned container never traps focus or scroll. `markers` never in production.
- Refresh ScrollTrigger after fonts and images settle (`document.fonts.ready`, image `decode()`), and on resize with a debounce.
- Text reveal: `SplitText` with `mask:'lines'` on the H1 only, `yPercent:110 → 0`, `expo.out` (or `power3.out`), duration ≤ 0.9 s, stagger 0.08, plays once per session; on cleanup call `revert()` so the accessible text is intact. Image reveal: `clip-path: inset(0 0 100% 0)` → `inset(0)` once, first 2 images only.
- Animate `transform`, `opacity`, `clip-path` only (use `x`, `y`, `scale`, `yPercent`, never `width/height/top/left/margin`). Do not animate the same element with both `motion` and GSAP.
- Smooth scrolling (Lenis) is OFF (`smoothScroll:false`). If a customer turns it on it applies to the home page only, is destroyed on route change, is skipped for reduced motion, and is synced with ScrollTrigger exactly as the Lenis README shows.

## M5 Accessibility, SEO and analytics for the layer
- The canvas and decorative layers are `aria-hidden`. All meaningful text (H1, story steps, facts) is real DOM text in reading order in every state, including prerendered HTML. The prerender (`seo/render.ts`) is unchanged and must not depend on the experience layer.
- No text only inside the canvas. Contrast of text over the canvas is checked on the rendered frame; add a scrim where needed.
- No motion starts automatically for longer than 5 s without the Pause control. No flashing. Pinned story respects reduced motion by being stacked.
- Analytics: log only `experience_loaded` and `experience_fallback` with a reason code (no PII), after consent.

## M6 Performance budgets for the layer (verify, do not assume)
- Home with the layer ON must still meet: LCP ≤ 2.5 s on a throttled mid-range profile (the LCP element stays the static poster), INP ≤ 200 ms, CLS 0 from the canvas (reserve its box with `aspect-ratio`), no long task > 50 ms from scene setup (create the scene in chunks across idle callbacks), total experience transfer ≤ 2.5 MB including the GLB.
- Sustained 50 fps or better on a mid-range Android during idle rotation and the story scrub; otherwise the adaptive quality fallback (M2.4) must trigger. Report numbers measured in the preview and mark device numbers "needs real-device check".

## M7 `/dev/experience` inspector (dev only, stripped from production)
Shows: gate decision and every reason, toggles to force the layer on/off and simulate save-data, low memory, 3g, reduced motion and WebGL missing; live FPS and frame-time graph; `renderer.info` calls, triangles, geometries, textures; GLB and chunk sizes (gz); ScrollTrigger count (must be 0 after leaving home); a button to fire `webglcontextlost`; a button that verifies disposal.

## M8 Review output
After P7C output a table `| Check | Result | Evidence |` for M2 to M7, and the K8 table for every animated element in the layer. Anything not verifiable in the preview is marked "needs real-device check".

---

# SECTION N — CLIENT DATA AND COMMUNICATION SURFACES (phone, WhatsApp widget, social links, address, client information)
Goal: swapping a customer means editing `client.config.ts`, assets and the catalog. No component, route or style is edited. Everything below reads from config only.

## N1 One source and placeholder safety
- Every phone, WhatsApp number, email, address, social URL, hours value and legal id exists ONCE in `client.config.ts` and is read through helpers. Never typed into a component, i18n string, JSON-LD template or test fixture.
- Placeholders in `client.demo.config.ts` are unmistakable and machine-detectable: phone `+91 00000 00000`, WhatsApp `910000000000`, email `hello@example.com`, social `https://www.instagram.com/REPLACE_ME/`, address line `REPLACE_ME`, GSTIN/FSSAI `REPLACE_ME`. `isPlaceholder(value)` matches `REPLACE_ME`, `example.com`, all-zero digits, `Lorem`.
- In dev and preview a placeholder renders with a small visible DEV badge, and a placeholder WhatsApp or phone link is inert (no navigation, toast "Placeholder number, set it in client.config.ts"). Never let a fake number open a real chat.
- `scripts/check-client.ts` (`npm run check:client`) validates the config and prints a table: Indian mobile or landline format and E.164 normalisation; WhatsApp number digits only and starting with a country code; email; 6-digit pincode not 000000; `state` in the list; lat/lng inside India when given; GSTIN structure and checksum (reuse the wholesale validator); FSSAI 14 digits; hours present with timezone; delivery zones and shipping slabs present; every social URL is `https` and its host matches its platform; logo, favicon set, og image, hero poster exist; every SKU has image and alt; legal values non-empty for enabled features; no placeholder left in any ENABLED field. Without `CLIENT_STRICT=1` it prints warnings and exits 0; with `CLIENT_STRICT=1` any failure exits 1. The deployment build runs it with `CLIENT_STRICT=1` so a fake number can never ship. The same pure rule functions are imported by `/dev/checks` so they also run in the browser preview.

## N2 Address and client information
- `contact.addressParts` is structured; `formatAddress(config, 'oneLine' | 'multiLine')` in `shared/address.ts` is the only formatter. Footer, contact block, invoices (seller), legal pages and JSON-LD `PostalAddress` all use it, so name, address and phone are identical everywhere (NAP consistency).
- Directions: `contact.mapUrl` if set, else the Google Maps directions URL built from lat/lng (`https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>`). Opens in a new tab with `rel="noopener noreferrer"`. No map iframe in v1.
- Client information shown to customers comes only from config: legal name, FSSAI, GSTIN (not in JSON-LD), hours with weekly off and holidays, contact person (optional), languages offered. Anything the client has not given is omitted entirely, never filled with plausible text.
- Hours helper `getShopStatus(config, now)` returns open/closed/next-open in the config timezone; used by the widget badge, the home status line and the contact block.

## N3 Social links
- `<SocialLinks/>` renders `config.social` in config order as 44 px icon links in the footer and the contact/about block; nothing renders when the list is empty or only placeholders in production.
- Icons are small inline SVG brand glyphs in `src/components/BrandIcon.tsx` (Instagram, Facebook, YouTube, X, LinkedIn, Google), `currentColor`, no icon-font and no extra dependency. Each link: visible focus, `aria-label="Instagram, opens in a new tab"`, `target="_blank"`, `rel="noopener noreferrer"`. Tracked as `click_social` (Section G), after consent.
- Organization/LocalBusiness JSON-LD `sameAs` is built from the same list (https URLs only).
- Instagram is link-out only. No third-party feed widget or embed script (privacy, CSP, performance). The optional "From our Instagram" block on home uses `config.instagramGrid` (2 to 6 local images, each with alt and a link to the real post) and renders only with at least 3 items.

## N4 WhatsApp widget and messages
**What WhatsApp can and cannot do from a website (be honest in the UI and the handoff).** A `https://wa.me/<number>?text=<encoded>` link opens a chat with a prefilled message; it does not send anything, the customer must press Send, and an enquiry counts as received only after they do. The number is digits only in international form (no plus, zeros, brackets or dashes). `https://wa.me/c/<number>` opens the business catalogue only if the client has enabled a WhatsApp Business catalogue (otherwise WhatsApp shows an invalid-catalogue message), so it is behind `whatsapp.catalogEnabled` (default false). `https://wa.me/message/<code>` short links (from the WhatsApp Business app) allow changing the prefilled text later and are used if `whatsapp.shortLink` is set. A real chatbot, orders created inside WhatsApp, in-chat catalogue ordering and payments or status messages through WhatsApp need the WhatsApp Business Platform (Cloud API) and the backend Worker: not built here, listed in handoff as a phase-2 add-on.

**`shared/whatsapp.ts` (pure, tested):** `normalizeWaNumber(input)` (strips formatting, adds 91 to 10-digit Indian mobiles, rejects the rest), `renderTemplate(template, ctx)` with `{brand} {product} {pack} {url} {items} {total} {pincode} {code}`, and `buildWhatsAppUrl(kind, ctx, config)` for kind = general | cart | product | track | wholesale. It URL-encodes with `encodeURIComponent`, strips control characters, caps the message at 1,000 characters (cart lines beyond the cap become "+N more"), never includes a name, phone, address or email, and returns `null` for a placeholder or invalid number. Templates live in `config.whatsapp.messages`.

**`<WhatsAppWidget/>`** (customer layout only, zero dependencies, inline SVG, CSS only, ≤ 2 KB gz; third-party widget scripts such as Elfsight or Tidio are banned):
- A 56 px floating button, bottom-right (or left per config), positioned above the cart bar and bottom nav and the safe area (`bottom: calc(var(--cartbar-h) + var(--bottomnav-h) + 12px + env(safe-area-inset-bottom))`). Fill `--brand-whatsapp: #128C7E` with a white glyph (4.1:1, new token, A4 untouched). Label "Chat on WhatsApp"; `aria-expanded`, `aria-controls`.
- Hidden on `/admin/*`, the payment step of checkout, and while any sheet or dialog is open. Shown on everything else, including order status. Never auto-opens, no sound, no chat bubble pop-up. Optional `nudge`: one gentle pulse after 20 s on home or a product page, once per session (sessionStorage in try/catch), none with reduced motion.
- Tap opens a small panel (`role="dialog"`, Esc closes, focus returns to the button, 44 px rows). Header: brand name and the shop status from `getShopStatus()` ("Open now" or "Closed now, opens at 9 am; message us and we will reply then"). `replyTimeText` is shown only if the client supplied it. Quick actions, each a real link:
  1. **Order now:** primary. With items in the cart it becomes "Send my cart on WhatsApp" (message lists items, pack, qty, the quoted total from the quote engine as display-only, and the serviceable pincode); with an empty cart it links to `/shop`. Copy on the panel: "Opens WhatsApp with your cart. We confirm availability and next steps there." It does NOT create an order; it is an enquiry until the shop confirms.
  2. **View menu / products:** `/shop`; if `catalogEnabled`, a second row "Open WhatsApp catalogue" (`wa.me/c/<number>`).
  3. **Track my order:** `/track`; on an order page it opens WhatsApp with that order code.
  4. **Ask about this product:** only on a product page, prefilled with the product, pack and canonical URL.
  5. **Bulk or wholesale enquiry:** only if `features.wholesale`.
  6. **Call us:** `tel:`.
- The label "menu" is configurable (`copy.menuLabel`: "View menu" for food shops, "Browse products" for packaged goods; default "Browse products").
- Every link carries `context` for `click_contact` (Section G). Desktop: same links (opens WhatsApp Web or the desktop app); a QR code is a listed add-on, not built.
- Keyboard and screen readers: reachable in logical order, focus visible and not hidden by the cart bar (K2), no focus trap beyond the open panel.
- With a placeholder or invalid number the panel renders with the DEV badge and inert links (N1), and in production the widget does not render.

## N5 Tests and acceptance for Section N
- vitest: `normalizeWaNumber` (spaces, +91, 0-prefix, 10-digit, invalid), `buildWhatsAppUrl` for every kind (encoding, length cap, no PII, null for placeholder), `formatAddress` (missing line2, missing area), `isPlaceholder`, `getShopStatus` (open, closed, weekly off, holiday, overnight hours), the `check:client` rules.
- Playwright-style manual scenarios added to H2: (a) swap `client.demo.config.ts` for a second fake client and confirm brand, phone, WhatsApp, address, social, hours and JSON-LD change everywhere with zero code edits; (b) cart with 3 items → "Send my cart" message correct and ≤ 1,000 chars; (c) closed hours show the closed message; (d) placeholder number is inert and badged; (e) `CLIENT_STRICT=1` fails the build while any placeholder remains; (f) widget never overlaps the cart bar or hides a focused control.

## N6 `docs/client-intake.md` (written in P9, sent to every new client)
One page, plain language, each answer mapped to a config key: business and legal name; owner/contact person; phone; WhatsApp business number and whether the WhatsApp Business app and catalogue are set up; email; full address in parts plus a Google Maps link; opening hours, weekly off and holidays; Instagram, Facebook, YouTube and Google Business links; GSTIN and FSSAI; delivery areas, shipping slabs and minimums; payment methods; brand colours and logo files (or "none"); photo plan; product list (CSV template); policies (refund, shipping) to confirm; languages; domain; analytics id. Ends with the "you must supply" list from J9 and what is NOT included (WhatsApp chatbot and in-WhatsApp ordering, real payment keys, backend).

---

# SECTION O — MASTER-REPO ENGINEERING AND INTEGRATION SEAMS (so a new customer never needs a code change or a rebuild)
Scope is an item-selling store: packaged goods, retail plus wholesale, local plus all-India shipping. Restaurant menus, hot-food slots and table ordering are out of scope.

## O1 The client boundary (enforced, not hoped for)
- Client-specific inputs are exactly: `client.config.ts`, `public/client/` (logo, favicons, og image, hero and product photos), `data/catalog.*` (products, packs, prices, synonyms) and `i18n/overrides.en.ts`. Nothing else may contain a client fact (name, phone, address, GSTIN, social URL, product name).
- `scripts/check-boundaries.ts` (`npm run check:boundaries`) scans `src/`, `scripts/` and tests for the demo brand name, any phone or email literal, any `wa.me`, `instagram.com` or `maps.google` URL, any 10-digit or 12-digit number that looks like a phone, any GSTIN or FSSAI pattern, and hard-coded hex colours or px font sizes outside tokens. Any hit fails the check (allowlist: `client.demo.config.ts`, fixtures under `tests/fixtures/`).
- Customer branches change only the client-boundary files. A fix needed by every customer is made in `main` and merged into the customer branches (O7).

## O2 Provider seams (interfaces now, real adapters later; the UI never changes)
In `src/shared/providers.ts`, with the mock implementations the spec already uses:
- `PaymentProvider { id, createPayment(order), verify(payload), refund(paymentId, amountPaise) }`. `config.payments.provider` = `'razorpay' | 'payu' | 'cashfree' | 'cod-only'`, default `'razorpay'`. Only the Razorpay mock is built; the other values render the same `<PaymentLauncher/>` mock labelled with the provider name, and the handoff table lists the real adapter each needs. Amounts are always integer paise; the provider never sees a computed total from the client.
- `CourierProvider { id, trackingUrl(awb), createShipment?(order) }`. `config.shipping.couriers[]` has `{id,name,trackingUrlTemplate}` (for example `https://example.com/track/{awb}`). v1 is manual (O3); automatic shipment creation (Shiprocket, Delhivery and similar) is an adapter added with the Worker.
- `NotificationProvider { send(event, order, channel) }` with channels `email` (default, mock outbox at /dev/outbox), `whatsapp` and `sms` (interfaces only, need the WhatsApp Business Platform or an SMS provider). Event templates live in `src/shared/notify/`: `order_placed`, `payment_received`, `dispatched`, `delivered`, `cancelled`, `refund_issued`, each with plain text and HTML, built from config so no client wording is hard-coded.
- Every provider has a contract test that runs against the mock, so the real adapter can be validated with the same test.

## O3 Dispatch and tracking (the biggest day-one gap for an item store)
- Admin order page: "Mark dispatched" form with courier (from `config.shipping.couriers`), AWB number, optional tracking URL override, dispatch date and weight; saving moves status to `dispatched`, writes an audit line and queues the `dispatched` notification. Delivered and returned are separate admin actions with an audit line.
- Order status page and `/track`: show courier, AWB (copy button) and a "Track on courier site" link built from the template (`rel="noopener noreferrer"`). Without an AWB it says "Packed, we will share tracking once it ships". Local delivery and pickup show their own states.
- The AWB and tracking URL are never part of JSON-LD or analytics events.

## O4 Free-delivery nudge
Cart and checkout show "Add ₹X more for free delivery" only when the quote engine reports a real threshold for the customer's zone and the cart is below it. No fake countdowns, no invented thresholds (J trust rules). Hidden when no threshold exists.

## O5 Image pipeline (client photos are 4 to 8 MB phone images)
- `scripts/optimise-images.ts` (`npm run images`, uses `sharp`, run locally; the AI Studio preview may not execute it): input `public/client/raw/`, output AVIF and WebP at 320, 640, 960 and 1280 px wide, 4:3 product crop with optional focal point from `data/catalog`, a JSON manifest, max 150 KB per 640 px variant. It fails if a product image has no alt text in the catalog data.
- `<Img/>` reads the manifest to emit `srcset`, `sizes`, `width`, `height` and the fallback box; it never links a raw upload.

## O6 Catalog data and search for Indian item names
- `data/catalog.*` is validated by one Zod schema shared by the CSV importer, the admin editor and `check:client`. Fields include HSN, GST rate, net weight, pack sizes, MRP, retail price, wholesale tiers, stock, images with alt, `synonyms[]` (for example regional names and common misspellings), and `searchKeywords[]`.
- Search matches name, synonyms and keywords, tolerates one typo, and ignores case and diacritics; results never show an item the client marked hidden.

## O7 CI, budgets, versioning and upgrades
- `.github/workflows/ci.yml` runs on push and pull request: install (locked), `typecheck` (`tsc --noEmit`), `lint`, `test` (vitest), `check:boundaries`, `check:client` (strict on customer branches, warnings on `main`), build, `check:budget`, prerender check (`/dev/seo` rules run headless: one H1, canonical, JSON-LD parses, no price mismatch).
- `scripts/check-budget.ts` reads `dist/` and fails if the initial JS exceeds 170 KB gz, any route chunk exceeds its budget, or (experience on) the layer exceeds the M2 budgets. No budget library; use Node's `zlib`.
- An end-to-end golden path (`e2e/golden-path.spec.ts`: browse, add to cart, pincode, quote, checkout with the mock payment, order status) is written with Playwright for local and CI runs; mark it "not run in preview" in docs/progress.md.
- `CHANGELOG.md` and semantic version tags (`v1.0.0`). `docs/upgrade-guide.md`: add the master as `upstream`, merge tagged releases into each customer branch, resolve conflicts only in client-boundary files, run CI, deploy.

## O8 Known add-ons (listed in docs/handoff.md, not built, each needs the Worker or a third party)
Back-in-stock notification; abandoned-cart reminders; GST credit notes for refunds and returns (invoice numbers stay immutable; the admin shows a "Credit note: phase 2" placeholder on refunded orders); automatic courier shipment creation; WhatsApp Business Platform messages; real payment adapters and webhooks; Google review link (`https://search.google.com/local/writereview?placeid=<placeId>` once the client supplies the Place ID); product 3D viewer; QR code for the WhatsApp link.

## O9 `/dev/checks` (verification that works inside the AI Studio preview)
A dev-only page that runs, in the browser, every check that does not need a terminal, and honestly lists the rest:
- **Runs in-page (pure functions):** the client-config validator and Strict toggle (N1: formats, placeholders, completeness), `normalizeWaNumber` and `buildWhatsAppUrl` for every kind with their cases, `formatAddress`, `getShopStatus` (open, closed, weekly off, holiday, overnight), `isPlaceholder`, `shouldLoadExperience` reasons (M2), the quote engine cases (link to `/dev/quote-cases`), money rounding and en-IN grouping, GSTIN checksum cases, and the SEO rules for the current route (link to `/dev/seo`). Each row shows PASS or FAIL with the input and output.
- **Cannot run here, shown as NOT RUN with the command and where it runs:** typecheck, lint, vitest, check:boundaries, check:budget, image script, Playwright. Each line says "runs in CI after GitHub sync" or "run locally".
- A summary line at the top: "N in-page checks passed, M failed, K need CI". Never show a green state for a check that did not run.
