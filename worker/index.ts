import { Hono } from 'hono';
import { AppError } from '../src/shared/errors';
import type { AppEnv } from './env';
import { envelope, STATUS_BY_CODE } from './lib/errors';
import { log } from './lib/logger';
import { bodyLimit, sameOrigin } from './middleware/security';
import { requestId } from './middleware/requestId';
import { configRoutes } from './routes/config';

export function createApp(extend?: (api: Hono<AppEnv>) => void) {
  const app = new Hono<AppEnv>();
  app.use('*', requestId);

  const api = new Hono<AppEnv>();
  api.use('*', sameOrigin, bodyLimit());
  api.get('/health', (c) => c.json({ ok: true, env: c.env?.ENVIRONMENT ?? 'local', requestId: c.get('requestId') }));
  api.route('/', configRoutes);
  extend?.(api);
  api.all('*', (c) => c.json(envelope('NOT_FOUND', 'Unknown API route.', c.get('requestId')), 404));
  app.route('/api', api);

  app.onError((err, c) => {
    const rid = c.get('requestId') ?? 'unknown';
    if (err instanceof AppError) {
      return c.json(envelope(err.code, err.message, rid, err.field), (STATUS_BY_CODE[err.code] ?? 400) as 400);
    }
    log('error', 'unhandled', { requestId: rid, path: new URL(c.req.url).pathname, error: err instanceof Error ? err.message : 'unknown' });
    return c.json(envelope('SERVER', 'Something went wrong on our side.', rid), 500);
  });

  // Everything else is the SPA (Workers Static Assets handles it in production).
  app.all('*', async (c) => (c.env?.ASSETS ? await c.env.ASSETS.fetch(c.req.raw) : c.json(envelope('NOT_FOUND', 'Not found.', c.get('requestId')), 404)));
  return app;
}

const app = createApp();
export default app;
