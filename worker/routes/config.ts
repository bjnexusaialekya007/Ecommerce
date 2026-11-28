import { Hono } from 'hono';
import type { ClientConfig } from '../../src/config/schema';
import { clientConfig } from '../../src/config/client.config';
import type { AppEnv } from '../env';

// Public subset only. Admin allowlist and anything operational never leaves the server.
export function toPublicConfig(cfg: ClientConfig): Omit<ClientConfig, 'adminAllowlist'> {
  const { adminAllowlist: _drop, ...rest } = cfg;
  void _drop;
  return rest;
}

export const configRoutes = new Hono<AppEnv>().get('/config/public', (c) => {
  c.header('cache-control', 'public, max-age=60');
  return c.json(toPublicConfig(clientConfig));
});
