import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../env';
import { envelope } from '../lib/errors';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Same-origin only: reject cross-site state-changing requests (CSRF defence, no CORS needed).
export const sameOrigin: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (MUTATING.has(c.req.method)) {
    const site = c.req.header('sec-fetch-site');
    const origin = c.req.header('origin');
    const selfOrigin = new URL(c.req.url).origin;
    const crossSite = site === 'cross-site' || site === 'same-site' || (origin !== undefined && origin !== selfOrigin);
    if (crossSite) return c.json(envelope('FORBIDDEN', 'Cross-origin request rejected.', c.get('requestId')), 403);
  }
  await next();
};

// Cap request body size (default 100 KB; uploads get their own limit in W6).
export const bodyLimit = (maxBytes = 100 * 1024): MiddlewareHandler<AppEnv> => async (c, next) => {
  const len = Number(c.req.header('content-length') ?? 0);
  if (len > maxBytes) return c.json(envelope('VALIDATION', 'Request body too large.', c.get('requestId')), 413);
  await next();
};
