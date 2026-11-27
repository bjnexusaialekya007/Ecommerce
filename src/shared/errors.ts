export type ErrorCode =
  | 'OUT_OF_STOCK'
  | 'PRICE_CHANGED'
  | 'SHOP_CLOSED'
  | 'NOT_SERVICEABLE'
  | 'COUPON_INVALID'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_FAILED'
  | 'RATE_LIMITED'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'SERVER';

export interface ErrorRecovery {
  code: ErrorCode;
  message: string;
  actionLabel: string;
}

export const ERROR_RECOVERY_MAP: Record<ErrorCode, ErrorRecovery> = {
  OUT_OF_STOCK: {
    code: 'OUT_OF_STOCK',
    message: 'One or more packs in your cart just sold out.',
    actionLabel: 'Browse similar packs',
  },
  PRICE_CHANGED: {
    code: 'PRICE_CHANGED',
    message: 'Pack price updated since you added it. Review the new total below.',
    actionLabel: 'Review cart',
  },
  SHOP_CLOSED: {
    code: 'SHOP_CLOSED',
    message: 'Store is currently closed for new orders. You can still browse.',
    actionLabel: 'Check hours',
  },
  NOT_SERVICEABLE: {
    code: 'NOT_SERVICEABLE',
    message: 'We do not deliver to this pincode yet.',
    actionLabel: 'Try All-India courier or call us',
  },
  COUPON_INVALID: {
    code: 'COUPON_INVALID',
    message: 'This coupon code cannot be applied to your cart.',
    actionLabel: 'Remove coupon',
  },
  PAYMENT_PENDING: {
    code: 'PAYMENT_PENDING',
    message: 'We are confirming your payment. Please do not pay again.',
    actionLabel: 'Check order status',
  },
  PAYMENT_FAILED: {
    code: 'PAYMENT_FAILED',
    message: 'Payment did not go through. Your cart is safe.',
    actionLabel: 'Retry or switch method',
  },
  RATE_LIMITED: {
    code: 'RATE_LIMITED',
    message: 'Too many requests in a short time. Please wait a minute.',
    actionLabel: 'Try again shortly',
  },
  UNAUTHENTICATED: {
    code: 'UNAUTHENTICATED',
    message: 'Your session expired. Please sign in again.',
    actionLabel: 'Sign in',
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    message: 'You do not have access to this resource.',
    actionLabel: 'Go home',
  },
  VALIDATION: {
    code: 'VALIDATION',
    message: 'Please check the highlighted fields.',
    actionLabel: 'Fix fields',
  },
  NOT_FOUND: {
    code: 'NOT_FOUND',
    message: 'We could not find what you were looking for.',
    actionLabel: 'Back to shop',
  },
  SERVER: {
    code: 'SERVER',
    message: 'Something went wrong on our side.',
    actionLabel: 'Try again or call us',
  },
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly field?: string;
  readonly status: number;

  constructor(code: ErrorCode, message?: string, field?: string, status = 400) {
    super(message || ERROR_RECOVERY_MAP[code].message);
    this.name = 'AppError';
    this.code = code;
    this.field = field;
    this.status = status;
  }
}

export function logError(err: unknown, context?: Record<string, unknown>): void {
  const payload = {
    ts: new Date().toISOString(),
    message: err instanceof Error ? err.message : String(err),
    code: err instanceof AppError ? err.code : 'UNKNOWN',
    ...context,
  };
  console.error('[AppError]', payload);
}
