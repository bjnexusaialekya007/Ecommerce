CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`summary` text NOT NULL,
	`request_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_log_created_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_log_entity_idx` ON `audit_log` (`entity`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE `coupons` (
	`code` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`value` integer NOT NULL,
	`max_discount_paise` integer,
	`min_order_paise` integer DEFAULT 0 NOT NULL,
	`valid_from` text NOT NULL,
	`valid_to` text NOT NULL,
	`max_uses` integer,
	`used_count` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	CONSTRAINT "coupons_ck" CHECK("coupons"."value" > 0 and "coupons"."min_order_paise" >= 0 and "coupons"."used_count" >= 0 and ("coupons"."max_discount_paise" is null or "coupons"."max_discount_paise" >= 0))
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text NOT NULL,
	`buyer_type` text DEFAULT 'retail' NOT NULL,
	`business_name` text,
	`gstin` text,
	`state_code` text NOT NULL,
	`address` text,
	`wholesale_status` text,
	`reject_reason` text,
	`approved_at` text,
	`anonymised_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_email_uq` ON `customers` (`email`);--> statement-breakpoint
CREATE INDEX `customers_phone_idx` ON `customers` (`phone`);--> statement-breakpoint
CREATE INDEX `customers_wholesale_idx` ON `customers` (`wholesale_status`);--> statement-breakpoint
CREATE TABLE `email_log` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text,
	`event` text NOT NULL,
	`to_email` text NOT NULL,
	`subject` text NOT NULL,
	`status` text NOT NULL,
	`attempt` integer DEFAULT 1 NOT NULL,
	`error` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `email_log_order_idx` ON `email_log` (`order_id`);--> statement-breakpoint
CREATE INDEX `email_log_status_idx` ON `email_log` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `invoice_counters` (
	`fy` text PRIMARY KEY NOT NULL,
	`last_no` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`sku_id` text NOT NULL,
	`sku_code` text NOT NULL,
	`name` text NOT NULL,
	`pack_label` text NOT NULL,
	`hsn_code` text NOT NULL,
	`gst_rate` integer NOT NULL,
	`qty` integer NOT NULL,
	`unit_paise` integer NOT NULL,
	`taxable_value` integer NOT NULL,
	`cgst` integer DEFAULT 0 NOT NULL,
	`sgst` integer DEFAULT 0 NOT NULL,
	`igst` integer DEFAULT 0 NOT NULL,
	`line_total` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`sku_id`) REFERENCES `skus`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "order_items_ck" CHECK("order_items"."qty" >= 1 and "order_items"."unit_paise" >= 0 and "order_items"."taxable_value" >= 0 and "order_items"."line_total" >= 0)
);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_items_sku_idx` ON `order_items` (`sku_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`public_code` text NOT NULL,
	`invoice_no` text,
	`invoice_token` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`status` text NOT NULL,
	`payment_status` text NOT NULL,
	`payment_method` text NOT NULL,
	`mode` text NOT NULL,
	`buyer_type` text NOT NULL,
	`customer_id` text,
	`customer_name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`address_summary` text DEFAULT '' NOT NULL,
	`pincode` text DEFAULT '' NOT NULL,
	`state_code` text NOT NULL,
	`gstin` text DEFAULT '' NOT NULL,
	`business_name` text DEFAULT '' NOT NULL,
	`place_of_supply_state` text NOT NULL,
	`is_inter_state` integer NOT NULL,
	`prices_inclusive` integer NOT NULL,
	`subtotal` integer NOT NULL,
	`discount` integer DEFAULT 0 NOT NULL,
	`shipping` integer DEFAULT 0 NOT NULL,
	`cgst` integer DEFAULT 0 NOT NULL,
	`sgst` integer DEFAULT 0 NOT NULL,
	`igst` integer DEFAULT 0 NOT NULL,
	`tax` integer DEFAULT 0 NOT NULL,
	`total` integer NOT NULL,
	`ship_weight_g` integer DEFAULT 0 NOT NULL,
	`coupon_code` text,
	`razorpay_order_id` text,
	`razorpay_payment_id` text,
	`courier_name` text,
	`tracking_id` text,
	`tracking_url` text,
	`dispatch_by` text DEFAULT '' NOT NULL,
	`pay_by` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`attribution_json` text,
	`amount_mismatch_flag` integer DEFAULT false NOT NULL,
	`email_failed_flag` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "orders_status_ck" CHECK("orders"."status" in ('pending_payment','paid','packed','shipped','delivered','cancelled','expired','refunded')),
	CONSTRAINT "orders_payment_status_ck" CHECK("orders"."payment_status" in ('pending','captured','failed','cod_pending','refunded','amount_mismatch')),
	CONSTRAINT "orders_payment_method_ck" CHECK("orders"."payment_method" in ('razorpay','cod')),
	CONSTRAINT "orders_mode_ck" CHECK("orders"."mode" in ('local','courier','pickup')),
	CONSTRAINT "orders_money_ck" CHECK("orders"."subtotal" >= 0 and "orders"."discount" >= 0 and "orders"."shipping" >= 0 and "orders"."cgst" >= 0 and "orders"."sgst" >= 0 and "orders"."igst" >= 0 and "orders"."tax" >= 0 and "orders"."total" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_public_code_unique` ON `orders` (`public_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_invoice_no_unique` ON `orders` (`invoice_no`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_idempotency_key_unique` ON `orders` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `orders_status_created_idx` ON `orders` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `orders_payment_status_idx` ON `orders` (`payment_status`);--> statement-breakpoint
CREATE INDEX `orders_phone_idx` ON `orders` (`phone`);--> statement-breakpoint
CREATE INDEX `orders_customer_idx` ON `orders` (`customer_id`);--> statement-breakpoint
CREATE INDEX `orders_razorpay_order_idx` ON `orders` (`razorpay_order_id`);--> statement-breakpoint
CREATE TABLE `otp` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`code_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`consumed_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `otp_email_role_idx` ON `otp` (`email`,`role`,`created_at`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`provider` text DEFAULT 'razorpay' NOT NULL,
	`status` text NOT NULL,
	`amount_paise` integer,
	`provider_order_id` text,
	`provider_payment_id` text,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "payments_ck" CHECK("payments"."amount_paise" is null or "payments"."amount_paise" >= 0)
);
--> statement-breakpoint
CREATE INDEX `payments_order_idx` ON `payments` (`order_id`);--> statement-breakpoint
CREATE INDEX `payments_provider_payment_idx` ON `payments` (`provider_payment_id`);--> statement-breakpoint
CREATE TABLE `price_log` (
	`id` text PRIMARY KEY NOT NULL,
	`sku_id` text NOT NULL,
	`sku_code` text NOT NULL,
	`old_retail_paise` integer NOT NULL,
	`new_retail_paise` integer NOT NULL,
	`changed_by` text NOT NULL,
	`changed_at` text NOT NULL,
	FOREIGN KEY (`sku_id`) REFERENCES `skus`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `price_log_sku_idx` ON `price_log` (`sku_id`,`changed_at`);--> statement-breakpoint
CREATE TABLE `price_tiers` (
	`id` text PRIMARY KEY NOT NULL,
	`sku_id` text NOT NULL,
	`min_qty` integer NOT NULL,
	`price_paise` integer NOT NULL,
	FOREIGN KEY (`sku_id`) REFERENCES `skus`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "price_tiers_ck" CHECK("price_tiers"."min_qty" >= 1 and "price_tiers"."price_paise" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `price_tiers_sku_qty_uq` ON `price_tiers` (`sku_id`,`min_qty`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`ingredients` text DEFAULT '' NOT NULL,
	`allergens` text DEFAULT '' NOT NULL,
	`veg` integer DEFAULT true NOT NULL,
	`hsn_code` text NOT NULL,
	`gst_rate` integer NOT NULL,
	`shelf_life_days` integer NOT NULL,
	`storage` text DEFAULT '' NOT NULL,
	`bestseller` integer DEFAULT false NOT NULL,
	`image_url` text,
	`alt_text` text DEFAULT '' NOT NULL,
	`seo_title` text,
	`seo_description` text,
	`faq_json` text DEFAULT '[]' NOT NULL,
	`synonyms_json` text DEFAULT '[]' NOT NULL,
	`search_keywords_json` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "products_gst_ck" CHECK("products"."gst_rate" in (0, 5, 12, 18, 28)),
	CONSTRAINT "products_shelf_ck" CHECK("products"."shelf_life_days" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX `products_category_status_idx` ON `products` (`category_id`,`status`);--> statement-breakpoint
CREATE TABLE `quote_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text NOT NULL,
	`gstin` text DEFAULT '' NOT NULL,
	`items_json` text DEFAULT '[]' NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`reply_note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `quote_requests_status_idx` ON `quote_requests` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text NOT NULL,
	`window_start` integer NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`key`, `window_start`)
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`sku_id` text NOT NULL,
	`qty` integer NOT NULL,
	`expires_at` text NOT NULL,
	`released_at` text,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`sku_id`) REFERENCES `skus`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "reservations_ck" CHECK("reservations"."qty" >= 1)
);
--> statement-breakpoint
CREATE INDEX `reservations_expires_idx` ON `reservations` (`expires_at`);--> statement-breakpoint
CREATE INDEX `reservations_order_idx` ON `reservations` (`order_id`);--> statement-breakpoint
CREATE INDEX `reservations_sku_idx` ON `reservations` (`sku_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id_hash` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`email` text NOT NULL,
	`customer_id` text,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	`revoked_at` text,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `sessions_expires_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `sessions_email_idx` ON `sessions` (`email`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shipping_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`zone_code` text NOT NULL,
	`zone_label` text NOT NULL,
	`min_weight_g` integer NOT NULL,
	`max_weight_g` integer NOT NULL,
	`fee_paise` integer NOT NULL,
	`free_above_paise` integer,
	CONSTRAINT "shipping_rates_ck" CHECK("shipping_rates"."min_weight_g" >= 1 and "shipping_rates"."max_weight_g" >= "shipping_rates"."min_weight_g" and "shipping_rates"."fee_paise" >= 0)
);
--> statement-breakpoint
CREATE INDEX `shipping_rates_zone_idx` ON `shipping_rates` (`zone_code`,`min_weight_g`);--> statement-breakpoint
CREATE TABLE `skus` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`sku_code` text NOT NULL,
	`pack_label` text NOT NULL,
	`net_weight_g` integer NOT NULL,
	`ship_weight_g` integer NOT NULL,
	`mrp_paise` integer NOT NULL,
	`retail_price_paise` integer NOT NULL,
	`wholesale_price_paise` integer,
	`wholesale_moq` integer DEFAULT 10 NOT NULL,
	`stock_qty` integer DEFAULT 0 NOT NULL,
	`low_stock_at` integer DEFAULT 10 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "skus_weight_ck" CHECK("skus"."net_weight_g" > 0 and "skus"."ship_weight_g" > 0),
	CONSTRAINT "skus_money_ck" CHECK("skus"."mrp_paise" >= 0 and "skus"."retail_price_paise" >= 0 and ("skus"."wholesale_price_paise" is null or "skus"."wholesale_price_paise" >= 0)),
	CONSTRAINT "skus_stock_ck" CHECK("skus"."stock_qty" >= 0),
	CONSTRAINT "skus_moq_ck" CHECK("skus"."wholesale_moq" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `skus_sku_code_unique` ON `skus` (`sku_code`);--> statement-breakpoint
CREATE INDEX `skus_product_status_idx` ON `skus` (`product_id`,`status`);--> statement-breakpoint
CREATE TABLE `slug_history` (
	`slug` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `slug_history_product_idx` ON `slug_history` (`product_id`);--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`event_id` text PRIMARY KEY NOT NULL,
	`provider` text DEFAULT 'razorpay' NOT NULL,
	`event_type` text NOT NULL,
	`received_at` text NOT NULL,
	`processed_at` text
);
--> statement-breakpoint
CREATE TABLE `zone_pincodes` (
	`pincode` text PRIMARY KEY NOT NULL,
	`zone_id` text NOT NULL,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `zone_pincodes_zone_idx` ON `zone_pincodes` (`zone_id`);--> statement-breakpoint
CREATE TABLE `zones` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`pincodes_json` text DEFAULT '[]' NOT NULL,
	`fee_paise` integer NOT NULL,
	`min_order_paise` integer DEFAULT 0 NOT NULL,
	`free_above_paise` integer,
	CONSTRAINT "zones_ck" CHECK("zones"."fee_paise" >= 0 and "zones"."min_order_paise" >= 0)
);
