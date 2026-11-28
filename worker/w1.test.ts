import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createApp } from './index';
import { parseBody } from './lib/validate';
import { redact } from './lib/logger';
import { clientConfig } from '../src/config/client.config';
import { fail } from './lib/errors';

const app = createApp();
const env = { ENVIRONMENT: 'local' as const };

describe('W1 scaffold', () => {
  it('GET /api/health returns 200 with a request id', async () => {
    const res = await app.request('/api/health', {}, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; requestId: string };
    expect(body.ok).toBe(true);
    expect(res.headers.get('x-request-id')).toBe(body.requestId);
  });

  it('invalid body returns the contract error envelope (real app handler)', async () => {
    const a = createApp((api) => {
      api.post('/t', async (c) => { await parseBody(c, z.object({ qty: z.number().int().min(1) })); return c.json({ ok: true }); });
    });
    const res = await a.request('http://x.test/api/t', { method: 'POST', body: JSON.stringify({ qty: 0 }), headers: { 'content-type': 'application/json' } }, env);
    expect(res.status).toBe(400);
    const j = (await res.json()) as { error: { code: string; field: string; requestId: string } };
    expect(j.error.code).toBe('VALIDATION');
    expect(j.error.field).toBe('qty');
    expect(j.error.requestId).toBe(res.headers.get('x-request-id'));
  });

  it('non-JSON body maps to VALIDATION', async () => {
    const a = createApp((api) => { api.post('/t', async (c) => c.json(await parseBody(c, z.object({})))); });
    const res = await a.request('http://x.test/api/t', { method: 'POST', body: 'not json', headers: { 'content-type': 'application/json' } }, env);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('VALIDATION');
  });

  it('thrown AppError uses its mapped status (RATE_LIMITED -> 429)', async () => {
    const a = createApp((api) => { api.get('/t', () => { throw fail('RATE_LIMITED'); }); });
    const res = await a.request('/api/t', {}, env);
    expect(res.status).toBe(429);
  });

  it('unexpected errors return a SERVER envelope and never leak the message', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const a = createApp((api) => { api.get('/t', () => { throw new Error('db password is hunter2'); }); });
    const res = await a.request('/api/t', {}, env);
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain('hunter2');
    expect((JSON.parse(text) as { error: { code: string } }).error.code).toBe('SERVER');
    spy.mockRestore();
  });

  it('unknown API route is a 404 envelope, not the SPA', async () => {
    const res = await app.request('/api/nope', {}, env);
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('NOT_FOUND');
  });

  it('rejects cross-site state-changing requests', async () => {
    const res = await app.request('/api/anything', { method: 'POST', headers: { 'sec-fetch-site': 'cross-site' } }, env);
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('FORBIDDEN');
  });

  it('allows same-origin POST through to routing', async () => {
    const res = await app.request('http://x.test/api/anything', { method: 'POST', headers: { origin: 'http://x.test', 'sec-fetch-site': 'same-origin' } }, env);
    expect(res.status).toBe(404);
  });

  it('rejects oversized bodies', async () => {
    const res = await app.request('/api/anything', { method: 'POST', headers: { 'content-length': String(200 * 1024) } }, env);
    expect(res.status).toBe(413);
  });

  it('GET /api/config/public never exposes the admin allowlist', async () => {
    const res = await app.request('/api/config/public', {}, env);
    expect(res.status).toBe(200);
    const text = await res.text();
    for (const e of clientConfig.adminAllowlist) expect(text).not.toContain(e);
    expect(text).not.toContain('adminAllowlist');
    expect((JSON.parse(text) as { brand: { name: string } }).brand.name).toBe(clientConfig.brand.name);
  });

  it('logger redacts PII fields', () => {
    const r = redact({ phone: '+91 98480 42110', email: 'a@b.in', nested: { gstin: '36AAA', ok: 1 }, count: 3 }) as Record<string, unknown>;
    expect(r.phone).toBe('[redacted]');
    expect(r.email).toBe('[redacted]');
    expect((r.nested as Record<string, unknown>).gstin).toBe('[redacted]');
    expect(r.count).toBe(3);
  });
});
