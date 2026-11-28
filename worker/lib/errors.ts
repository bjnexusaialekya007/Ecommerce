import { AppError, type ErrorCode } from '../../src/shared/errors';

// Contract envelope: { error: { code, message, field?, requestId } }
export const STATUS_BY_CODE: Record<ErrorCode, number> = {
  OUT_OF_STOCK: 409,
  PRICE_CHANGED: 409,
  SHOP_CLOSED: 409,
  NOT_SERVICEABLE: 422,
  COUPON_INVALID: 422,
  PAYMENT_PENDING: 409,
  PAYMENT_FAILED: 402,
  RATE_LIMITED: 429,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  VALIDATION: 400,
  NOT_FOUND: 404,
  SERVER: 500,
};

export interface ErrorEnvelope {
  error: { code: ErrorCode; message: string; field?: string; requestId: string };
}

export function envelope(code: ErrorCode, message: string, requestId: string, field?: string): ErrorEnvelope {
  return { error: { code, message, requestId, ...(field ? { field } : {}) } };
}

export { AppError };
export function fail(code: ErrorCode, message?: string, field?: string): AppError {
  return new AppError(code, message, field, STATUS_BY_CODE[code]);
}
