import type { Context } from 'hono';
import type { ZodType } from 'zod';
import { fail } from './errors';

// Validate JSON body with a shared zod schema; throws the contract VALIDATION error.
export async function parseBody<T>(c: Context, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw fail('VALIDATION', 'Request body must be valid JSON.');
  }
  const res = schema.safeParse(raw);
  if (!res.success) {
    const issue = res.error.issues[0];
    throw fail('VALIDATION', issue?.message ?? 'Invalid request.', issue?.path.join('.') || undefined);
  }
  return res.data;
}
