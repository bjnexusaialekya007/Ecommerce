import { ClientConfigSchema, type ClientConfig } from './schema';
import { clientConfig } from './client.config';
import { clientDemoConfig } from './client.demo.config';

export type { ClientConfig };
export { ClientConfigSchema, clientConfig, clientDemoConfig };

export interface ResolvedConfigResult {
  ok: true;
  config: ClientConfig;
  isDemo: boolean;
}

export interface BrokenConfigResult {
  ok: false;
  error: string;
}

export function resolveClientConfig(search = ''): ResolvedConfigResult | BrokenConfigResult {
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

export function applyConfigThemeToRoot(config: ClientConfig): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const t = config.theme;
  root.style.setProperty('--bg', t.bg);
  root.style.setProperty('--surface', t.surface);
  root.style.setProperty('--surface-low', t.surfaceLow || t.bg);
  root.style.setProperty('--surface-2', t.surface2);
  root.style.setProperty('--surface-high', t.surfaceHigh || t.surface2);
  root.style.setProperty('--surface-variant', t.surfaceVariant || t.surface2);
  root.style.setProperty('--ink', t.ink);
  root.style.setProperty('--ink-muted', t.inkMuted);
  root.style.setProperty('--primary', t.primary);
  root.style.setProperty('--primary-container', t.primaryContainer || t.primary);
  root.style.setProperty('--primary-hover', t.primaryHover);
  root.style.setProperty('--accent', t.accent);
  if (t.accentSoft || t.secondaryContainer) {
    root.style.setProperty('--accent-soft', t.accentSoft || t.secondaryContainer || '#E0EBE2');
  }
  if (t.secondary) root.style.setProperty('--secondary', t.secondary);
  if (t.secondaryContainer || t.accentSoft) {
    root.style.setProperty('--secondary-container', t.secondaryContainer || t.accentSoft || '#E0EBE2');
  }
  if (t.onSecondaryContainer) root.style.setProperty('--on-secondary-container', t.onSecondaryContainer);
  if (t.border) root.style.setProperty('--border', t.border);
  if (t.borderSoft) root.style.setProperty('--border-soft', t.borderSoft);
  root.style.setProperty('--font-display', config.fonts.display);
  root.style.setProperty('--font-sans', config.fonts.sans);

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute('content', t.bg);
}
