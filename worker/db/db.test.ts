import fs from 'node:fs';
import { getTableColumns } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { buildSeedStatements } from './seed';
import { CATALOG_TABLES, CLASSIFICATION, publicColumns } from './classification';

let dispose: () => Promise<void>;
let DB: D1Database;

async function run(sql: string, ...binds: unknown[]) {
  return DB.prepare(sql).bind(...binds).run();
}

beforeAll(async () => {
  const proxy = await getPlatformProxy<{ DB: D1Database }>({ persist: false });
  dispose = proxy.dispose;
  DB = proxy.env.DB;
  for (const f of fs.readdirSync('migrations').filter((n) => n.endsWith('.sql')).sort()) {
    for (const stmt of fs.readFileSync(`migrations/${f}`, 'utf8').split('--> statement-breakpoint')) {
      if (stmt.trim()) await DB.prepare(stmt.trim()).run();
    }
  }
  for (const s of buildSeedStatements()) await DB.prepare(s).run();
}, 60_000);
afterAll(async () => dispose?.());

// Must fail with a real constraint error (CHECK / UNIQUE / FOREIGN KEY / PRIMARY KEY), not a typo or syntax error.
const rejects = async (sql: string, ...b: unknown[]) => {
  let err: unknown;
  try { await run(sql, ...b); } catch (e) { err = e; }
  expect(err, `expected constraint error for: ${sql}`).toBeDefined();
  expect(String((err as Error).message) + String((err as { cause?: Error }).cause?.message ?? '')).toMatch(/CHECK|UNIQUE|FOREIGN KEY|PRIMARY KEY|constraint/i);
};

describe('W2 schema', () => {
  it('seed loaded the demo catalog', async () => {
    const r = await DB.prepare('select (select count(*) from products) p, (select count(*) from skus) s, (select count(*) from zone_pincodes) z').first<{ p: number; s: number; z: number }>();
    expect(r).toEqual({ p: 5, s: 12, z: 9 });
  });

  it('every catalog column is classified (public / buyer-approved / admin-only)', () => {
    for (const [name, table] of Object.entries(CATALOG_TABLES)) {
      const cols = Object.keys(getTableColumns(table)).sort();
      const classified = Object.keys(CLASSIFICATION[name as keyof typeof CLASSIFICATION]).sort();
      expect(classified, `classification of ${name}`).toEqual(cols);
    }
  });

  it('public column selectors never include wholesale or admin-only fields', () => {
    const sku = Object.keys(publicColumns('skus'));
    for (const banned of ['wholesalePricePaise', 'wholesaleMoq', 'lowStockAt', 'status']) expect(sku).not.toContain(banned);
    expect(Object.keys(publicColumns('priceTiers'))).toEqual([]);
    expect(Object.keys(publicColumns('products'))).not.toContain('status');
    expect(sku).toContain('retailPricePaise');
  });

  it('rejects negative paise', async () => {
    await rejects("insert into skus (id, product_id, sku_code, pack_label, net_weight_g, ship_weight_g, mrp_paise, retail_price_paise) values ('x1','prod-aloo-bhujia','NEG-1','1',1,1,100,-5)");
    await rejects("insert into price_tiers (id, sku_id, min_qty, price_paise) values ('t-neg','sku-ab-200',5,-1)");
  });

  it('enforces unique sku_code and unique slug', async () => {
    const sku = await DB.prepare('select * from skus limit 1').first<Record<string, unknown>>();
    await rejects("insert into skus (id, product_id, sku_code, pack_label, net_weight_g, ship_weight_g, mrp_paise, retail_price_paise) values ('dup1', ?, ?, 'x', 1, 1, 1, 1)", sku!.product_id, sku!.sku_code);
    const cat = await DB.prepare('select slug from categories limit 1').first<{ slug: string }>();
    await rejects("insert into categories (id, slug, name) values ('c-dup', ?, 'dup')", cat!.slug);
  });

  it('foreign keys restrict deletes (category with products, sku with tiers)', async () => {
    await rejects("delete from categories where id in (select category_id from products limit 1)");
    await rejects("delete from skus where id in (select sku_id from price_tiers limit 1)");
  });

  it('webhook_events: the same event id cannot be inserted twice', async () => {
    await run("insert into webhook_events (event_id, event_type, received_at) values ('evt_1','payment.captured','2026-01-01T00:00:00Z')");
    await rejects("insert into webhook_events (event_id, event_type, received_at) values ('evt_1','payment.captured','2026-01-01T00:00:01Z')");
  });

  const order = (id: string, code: string, key: string, invoice: string | null) =>
    run(
      `insert into orders (id, public_code, invoice_no, invoice_token, idempotency_key, status, payment_status, payment_method, mode, buyer_type, customer_name, phone, state_code, place_of_supply_state, is_inter_state, prices_inclusive, subtotal, total, created_at, updated_at)
       values (?, ?, ?, 'tok', ?, 'pending_payment', 'pending', 'razorpay', 'courier', 'retail', 'A B', '9848012345', '36', '36', 0, 1, 1000, 1000, '2026-01-01', '2026-01-01')`,
      id, code, invoice, key,
    );

  it('orders: idempotency key, public code and invoice number are unique', async () => {
    await order('o1', 'CODE0001', 'idem-1', 'INV/26-27/1');
    await rejects("insert into orders (id, public_code, invoice_token, idempotency_key, status, payment_status, payment_method, mode, buyer_type, customer_name, phone, state_code, place_of_supply_state, is_inter_state, prices_inclusive, subtotal, total, created_at, updated_at) values ('o2','CODE0002','t','idem-1','pending_payment','pending','razorpay','courier','retail','A','9','36','36',0,1,1,1,'x','x')");
    await expect(order('o3', 'CODE0001', 'idem-3', null)).rejects.toThrow(/UNIQUE/i);
    await expect(order('o4', 'CODE0004', 'idem-4', 'INV/26-27/1')).rejects.toThrow(/UNIQUE/i);
    await order('o5', 'CODE0005', 'idem-5', null);
    await order('o6', 'CODE0006', 'idem-6', null); // several unpaid orders may have no invoice number
  });

  it('orders: invalid status and negative totals are rejected', async () => {
    await rejects("update orders set total = -1 where id = 'o1'");
    await rejects("update orders set status = 'weird' where id = 'o1'");
    await rejects("update orders set payment_status = 'weird' where id = 'o1'");
  });

  it('reservations: expires_at is indexed (cron scan stays cheap)', async () => {
    const idx = await DB.prepare("select name from sqlite_master where type='index' and tbl_name='reservations'").all<{ name: string }>();
    expect(idx.results.map((r) => r.name)).toContain('reservations_expires_idx');
  });

  it('db.batch is atomic: a failing statement rolls the whole batch back', async () => {
    let failed = false;
    try {
      await DB.batch([
        DB.prepare("insert into settings (key, value, updated_at) values ('k_batch','1','x')"),
        DB.prepare("insert into settings (key, value, updated_at) values ('k_batch','dup','x')"),
      ]);
    } catch { failed = true; }
    expect(failed).toBe(true);
    const r = await DB.prepare("select count(*) n from settings where key='k_batch'").first<{ n: number }>();
    expect(r!.n).toBe(0);
  });
});
