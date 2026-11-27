import type { ClientConfig } from '../config/schema';
import { formatIstDateDisplay } from './calendar';
import { formatINR } from './money';
import type { NotificationEvent } from './providers';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface OrderEmailData {
  publicCode: string;
  customerName: string;
  totalPaise: number;
  items: Array<{ name: string; qty: number; lineTotal: number }>;
  addressSummary: string;
  dispatchBy: string;
  statusUrl: string;
  invoiceUrl: string;
  courierName?: string;
  trackingId?: string;
  trackingUrl?: string;
  reason?: string;
}

export function renderNotificationTemplate(
  event: NotificationEvent,
  config: ClientConfig,
  data: Partial<OrderEmailData> & { otpCode?: string; businessName?: string }
): { subject: string; text: string; html: string } {
  const brand = config.brand.name;
  const phone = config.contact.phone;

  if (event === 'otp') {
    const code = data.otpCode || '123456';
    return {
      subject: `${brand} sign-in code: ${code}`,
      text: `Your one-time code for ${brand} is ${code}. Valid for 10 minutes. (DEV mock accepts 123456)`,
      html: `<p>Your one-time code for <strong>${escapeHtml(brand)}</strong> is <strong>${escapeHtml(code)}</strong>. Valid for 10 minutes.</p>`,
    };
  }

  if (event === 'wholesale_approved' || event === 'wholesale_rejected') {
    const approved = event === 'wholesale_approved';
    const biz = data.businessName || 'your business';
    return {
      subject: approved
        ? `${brand}: Wholesale account approved`
        : `${brand}: Wholesale application update`,
      text: approved
        ? `Namaste, ${biz} is now approved for wholesale rates on ${brand}. Sign in at ${config.seo.siteUrl}/wholesale/login.`
        : `Namaste, your wholesale application for ${biz} was not approved. Reason: ${data.reason || 'Details could not be verified'}. Call ${phone} for help.`,
      html: approved
        ? `<p><strong>${escapeHtml(biz)}</strong> is now approved for wholesale rates on ${escapeHtml(brand)}.</p>`
        : `<p>Your wholesale application for <strong>${escapeHtml(biz)}</strong> was not approved: ${escapeHtml(data.reason || 'Details could not be verified')}.</p>`,
    };
  }

  const code = data.publicCode || 'ORD';
  const total = formatINR(data.totalPaise || 0);
  const itemLines = (data.items || []).map((i) => `- ${i.name} × ${i.qty} (${formatINR(i.lineTotal)})`).join('\n');
  const itemRowsHtml = (data.items || [])
    .map((i) => `<li>${escapeHtml(i.name)} × ${i.qty} — ${escapeHtml(formatINR(i.lineTotal))}</li>`)
    .join('');

  switch (event) {
    case 'owner_alert':
      return {
        subject: `[NEW ORDER] #${code} — ${total}`,
        text: `New order #${code} from ${data.customerName || 'Customer'}\nTotal: ${total}\n${itemLines}`,
        html: `<h2>New Order #${escapeHtml(code)}</h2><p>Customer: ${escapeHtml(data.customerName || '')} — Total: <strong>${escapeHtml(total)}</strong></p><ul>${itemRowsHtml}</ul>`,
      };
    case 'dispatched':
      return {
        subject: `${brand}: Order #${code} dispatched via ${data.courierName || 'Courier'}`,
        text: `Namaste ${data.customerName || ''},\nYour order #${code} has shipped via ${data.courierName || 'courier'}.\nTracking ID: ${data.trackingId || ''}\nTrack here: ${data.trackingUrl || data.statusUrl || ''}`,
        html: `<p>Namaste ${escapeHtml(data.customerName || '')},</p><p>Order <strong>#${escapeHtml(code)}</strong> shipped via <strong>${escapeHtml(data.courierName || '')}</strong>.</p><p>AWB: <code>${escapeHtml(data.trackingId || '')}</code></p><p><a href="${escapeHtml(data.trackingUrl || data.statusUrl || '#')}">Track shipment</a></p>`,
      };
    case 'cancelled':
      return {
        subject: `${brand}: Order #${code} cancelled`,
        text: `Your order #${code} was cancelled. Reason: ${data.reason || 'Cancelled on request'}. Questions? Call ${phone}.`,
        html: `<p>Order <strong>#${escapeHtml(code)}</strong> was cancelled. Reason: ${escapeHtml(data.reason || 'Cancelled on request')}.</p>`,
      };
    case 'refund_issued':
      return {
        subject: `${brand}: Refund issued for Order #${code}`,
        text: `A refund of ${total} has been initiated for order #${code}. It credits in 5–7 business days.`,
        html: `<p>A refund of <strong>${escapeHtml(total)}</strong> has been initiated for order <strong>#${escapeHtml(code)}</strong>.</p>`,
      };
    case 'delivered':
      return {
        subject: `${brand}: Order #${code} delivered`,
        text: `Your order #${code} has been delivered. Thank you for ordering from ${brand}.`,
        html: `<p>Order <strong>#${escapeHtml(code)}</strong> has been delivered. Thank you for ordering from ${escapeHtml(brand)}.</p>`,
      };
    case 'order_placed':
    case 'payment_received':
    default: {
      const dispatch = data.dispatchBy ? formatIstDateDisplay(data.dispatchBy) : 'within 2 working days';
      return {
        subject: `${brand}: Order #${code} confirmed (${total})`,
        text: `Namaste ${data.customerName || ''},\nThank you for your order #${code}.\n\nItems:\n${itemLines}\n\nTotal: ${total}\nAddress: ${data.addressSummary || ''}\nEstimated dispatch: ${dispatch}\nTrack order: ${data.statusUrl || ''}\nInvoice: ${data.invoiceUrl || ''}\nHelp: ${phone}`,
        html: `<p>Namaste ${escapeHtml(data.customerName || '')},</p><p>Order <strong>#${escapeHtml(code)}</strong> is confirmed.</p><ul>${itemRowsHtml}</ul><p><strong>Total:</strong> ${escapeHtml(total)}<br/><strong>Estimated dispatch:</strong> ${escapeHtml(dispatch)}<br/><strong>Delivery address:</strong> ${escapeHtml(data.addressSummary || '')}</p><p><a href="${escapeHtml(data.statusUrl || '#')}">Track order</a> · <a href="${escapeHtml(data.invoiceUrl || '#')}">View invoice</a></p>`,
      };
    }
  }
}
