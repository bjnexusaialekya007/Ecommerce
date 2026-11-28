import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { applyConfigThemeToRoot, resolveClientConfig } from './config';
import './index.css';

const search = typeof window !== 'undefined' ? window.location.search : '';
// Production fast path skips zod; dev and the ?invalidConfig=1 QA flag validate at runtime.
const resolved =
  import.meta.env.DEV || search.includes('invalidConfig=1') || search.includes('client=demo')
    ? (await import('./config/validate')).resolveClientConfigValidated(search)
    : resolveClientConfig();

const rootEl = document.getElementById('root')!;

if (!resolved.ok) {
  createRoot(rootEl).render(
    <div className="min-h-dvh bg-[#fbf6ee] text-[#221810] flex items-center justify-center p-6 font-sans">
      <div className="max-w-lg rounded-2xl border border-[#e0d2bc] bg-white p-6 space-y-3 shadow-sm">
        <h1 className="text-xl font-bold text-[#9c2a1b]">Store Configuration Error</h1>
        <p className="text-sm text-[#6a5c4c]">
          The application refused to boot because <code className="font-mono">client.config</code> failed schema validation:
        </p>
        <pre className="rounded-xl bg-[#f5ecdf] p-3 text-xs font-mono overflow-x-auto">{resolved.error}</pre>
      </div>
    </div>
  );
} else {
  applyConfigThemeToRoot(resolved.config);
  if (resolved.config.features.pwa && 'serviceWorker' in navigator) {
    import('virtual:pwa-register').then(({ registerSW }) => {
      registerSW({ immediate: true });
    }).catch(() => {
      // ignore if service worker registration unavailable
    });
  }
  createRoot(rootEl).render(
    <StrictMode>
      <App resolved={resolved} />
    </StrictMode>
  );
}
