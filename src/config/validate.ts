import { ClientConfigSchema } from './schema';
import { clientConfig } from './index';
import { clientDemoConfig } from './client.demo.config';
import type { BrokenConfigResult, ResolvedConfigResult } from './index';

/** Runtime validation and the demo config (dev, ?client=demo, ?invalidConfig=1). Loaded on demand. */
export { clientDemoConfig };
export function resolveClientConfigValidated(search = ''): ResolvedConfigResult | BrokenConfigResult {
  const params = new URLSearchParams(search);
  const clientParam = params.get('client');
  const invalidFlag = params.get('invalidConfig') === '1';
  const chosen = clientParam === 'demo' ? clientDemoConfig : clientConfig;
  const candidate = invalidFlag
    ? { ...chosen, contact: { ...chosen.contact, email: 'not-an-email' }, legal: { ...chosen.legal, stateCode: 'INVALID' } }
    : chosen;
  const parsed = ClientConfigSchema.safeParse(candidate);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return { ok: false, error: `Invalid client configuration: ${details}` };
  }
  return { ok: true, config: parsed.data, isDemo: clientParam === 'demo' };
}
