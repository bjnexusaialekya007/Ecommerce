import type { ClientConfig } from '../config/schema';

export interface PaymentCreateResult {
  providerOrderId: string;
  amountPaise: number;
  currency: 'INR';
}

export interface PaymentVerifyPayload {
  orderCode: string;
  providerOrderId: string;
  paymentId: string;
  signature: string;
}

export interface PaymentProvider {
  readonly id: ClientConfig['payments']['provider'];
  createPayment(order: { publicCode: string; totalPaise: number }): Promise<PaymentCreateResult>;
  verify(payload: PaymentVerifyPayload): Promise<{ verified: boolean }>;
  refund(paymentId: string, amountPaise: number): Promise<{ refundId: string; status: 'processed' }>;
}

export interface CourierProvider {
  readonly id: string;
  trackingUrl(awb: string): string;
  createShipment?(order: { publicCode: string; weightG: number }): Promise<{ awb: string }>;
}

export type NotificationEvent =
  | 'order_placed'
  | 'payment_received'
  | 'dispatched'
  | 'delivered'
  | 'cancelled'
  | 'refund_issued'
  | 'wholesale_approved'
  | 'wholesale_rejected'
  | 'owner_alert'
  | 'otp';

export type NotificationChannel = 'email' | 'whatsapp' | 'sms';

export interface NotificationMessage {
  id: string;
  event: NotificationEvent;
  channel: NotificationChannel;
  to: string;
  subject: string;
  text: string;
  html: string;
  status: 'sent' | 'failed';
  createdAt: string;
  orderCode?: string;
  error?: string;
}

export interface NotificationProvider {
  send(
    event: NotificationEvent,
    payload: { to: string; subject: string; text: string; html: string; orderCode?: string },
    channel?: NotificationChannel
  ): Promise<NotificationMessage>;
}

export function createMockPaymentProvider(id: ClientConfig['payments']['provider']): PaymentProvider {
  return {
    id,
    async createPayment(order) {
      return {
        providerOrderId: `${id}_ord_${order.publicCode}_${Date.now().toString(36)}`,
        amountPaise: order.totalPaise,
        currency: 'INR',
      };
    },
    async verify(payload) {
      return { verified: Boolean(payload.paymentId && payload.signature) };
    },
    async refund(paymentId) {
      return { refundId: `rfnd_${paymentId}_${Date.now().toString(36)}`, status: 'processed' };
    },
  };
}

export function createConfigCourierProvider(config: ClientConfig, courierName: string): CourierProvider {
  const found = config.shipping.couriers.find(
    (c) => c.name.toLowerCase() === courierName.toLowerCase() || c.id === courierName.toLowerCase()
  );
  const template =
    found?.trackingUrlTemplate ||
    config.courierTrackingTemplates[courierName] ||
    'https://www.delhivery.com/track/package/{awb}';
  return {
    id: found?.id || courierName.toLowerCase(),
    trackingUrl(awb: string) {
      return template.replace('{awb}', encodeURIComponent(awb.trim()));
    },
  };
}
