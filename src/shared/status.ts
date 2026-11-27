import { AppError } from './errors';
import type { FulfilmentMode } from './schemas';

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'expired'
  | 'refunded';

export const LEGAL_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['paid', 'cancelled', 'expired'],
  paid: ['packed', 'cancelled', 'refunded'],
  packed: ['shipped', 'delivered', 'cancelled', 'refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
  cancelled: ['refunded'],
  expired: ['paid'], // Late UPI capture recovery path
  refunded: [],
};

export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus): boolean {
  return LEGAL_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionOrderStatus(from, to)) {
    throw new AppError('VALIDATION', `Illegal status transition from "${from}" to "${to}"`, 'status', 409);
  }
}

export function getStatusLabel(status: OrderStatus, mode: FulfilmentMode): string {
  switch (status) {
    case 'pending_payment':
      return 'Awaiting payment';
    case 'paid':
      return 'Order placed';
    case 'packed':
      return 'Packed';
    case 'shipped':
      if (mode === 'local') return 'Out for delivery';
      if (mode === 'pickup') return 'Ready for pickup';
      return 'Shipped';
    case 'delivered':
      return mode === 'pickup' ? 'Picked up' : 'Delivered';
    case 'cancelled':
      return 'Cancelled';
    case 'expired':
      return 'Payment expired';
    case 'refunded':
      return 'Refunded';
  }
}
