export type AnalyticsEventName =
  | 'view_item_list'
  | 'select_item'
  | 'view_item'
  | 'search'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'view_cart'
  | 'begin_checkout'
  | 'add_shipping_info'
  | 'add_payment_info'
  | 'purchase'
  | 'generate_lead'
  | 'login'
  | 'click_contact'
  | 'click_social'
  | 'pincode_check'
  | 'experience_loaded'
  | 'experience_fallback'
  | 'experience_downgrade'
  | 'exception';

export interface LoggedAnalyticsEvent {
  id: string;
  ts: string;
  name: AnalyticsEventName;
  params: Record<string, unknown>;
  strippedKeys: string[];
  status: 'sent' | 'queued' | 'blocked_no_consent' | 'blocked_admin';
}
