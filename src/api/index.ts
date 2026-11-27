import { mockApiClient } from './mock/handler';

/**
 * Single seam swapped for fetch('/api/...') when connecting the Hono Worker backend.
 */
export const api = mockApiClient;
export * from './client';
