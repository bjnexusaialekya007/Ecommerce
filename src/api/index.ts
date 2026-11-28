import type { ApiClient } from './client';

/**
 * Single seam swapped for fetch('/api/...') when connecting the Hono Worker backend (W9).
 * The mock implementation is loaded on first call so it stays out of the main entry chunk.
 */
let impl: Promise<ApiClient> | undefined;
const load = (): Promise<ApiClient> => (impl ??= import('./mock/handler').then((m) => m.mockApiClient));

export const api: ApiClient = new Proxy({} as ApiClient, {
  get: (_target, prop: string) => (...args: unknown[]) =>
    load().then((client) => (client[prop as keyof ApiClient] as (...a: unknown[]) => unknown)(...args)),
});
export * from './client';
