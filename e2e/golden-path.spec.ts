/**
 * Playwright Golden-Path E2E specification (install @playwright/test to execute).
 */
export const GOLDEN_PATH_SCENARIO = [
  '1. Visit /, assert static hero photo LCP paints and WhatsApp widget renders cleanly above BottomNav.',
  '2. Navigate to /shop, filter/search "bhujia", open /p/aloo-bhujia, switch pack size chips, add 2 packs.',
  '3. Visit /cart, check pincode 500012 (local) or 400001 (courier), apply coupon NAMKEEN10.',
  '4. Proceed to /checkout, fill valid Indian phone + address, pass Turnstile checkbox, place COD or Simulated Razorpay payment.',
  '5. Confirm /order/:code shows Paid/Packed status and printable GST invoice at /invoice/:code?t=....',
  '6. Sign in at /admin/login with OTP 123456, confirm order appears in /admin/orders and transitions cleanly.',
];
