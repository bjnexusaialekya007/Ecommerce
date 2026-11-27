export const SHARED_PRODUCT_IMAGE_NAME = 'product-image';

type ViewTransitionDoc = Document & {
  startViewTransition?: (cb: () => void | Promise<void>) => {
    finished: Promise<void>;
    ready: Promise<void>;
    updateCallbackDone: Promise<void>;
  };
};

let cleanupTimer: number | null = null;

export function clearSharedNames(): void {
  if (typeof document === 'undefined') return;
  if (cleanupTimer !== null) {
    window.clearTimeout(cleanupTimer);
    cleanupTimer = null;
  }
  const tagged = document.querySelectorAll<HTMLElement>('[data-vt-shared]');
  for (const el of tagged) {
    el.style.viewTransitionName = '';
    el.removeAttribute('data-vt-shared');
  }
}

export function isElementInViewport(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  );
}

export function prepareSharedProductImage(containerOrEl: HTMLElement | null, enabled = true): void {
  clearSharedNames();
  if (!enabled || !containerOrEl || typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  if (document.documentElement.dataset.fx === 'off') return;

  const target = containerOrEl.matches('[data-product-image]')
    ? containerOrEl
    : containerOrEl.querySelector<HTMLElement>('[data-product-image]');
  if (!target || !isElementInViewport(target)) return;

  target.style.viewTransitionName = SHARED_PRODUCT_IMAGE_NAME;
  target.setAttribute('data-vt-shared', SHARED_PRODUCT_IMAGE_NAME);

  // Fallback cleanup if route aborted before transition finished
  cleanupTimer = window.setTimeout(clearSharedNames, 600);
}

export function supportsViewTransitions(): boolean {
  if (typeof document === 'undefined') return false;
  return typeof (document as ViewTransitionDoc).startViewTransition === 'function';
}

export function navigateWithTransition(
  update: () => void | Promise<void>,
  opts?: { enabled?: boolean; sourceEl?: HTMLElement | null }
): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    void update();
    return;
  }

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const fxOn = opts?.enabled !== false && document.documentElement.dataset.fx !== 'off';
  const doc = document as ViewTransitionDoc;

  if (!fxOn || reduced || typeof doc.startViewTransition !== 'function') {
    clearSharedNames();
    void update();
    return;
  }

  if (opts?.sourceEl) {
    prepareSharedProductImage(opts.sourceEl, true);
  } else {
    clearSharedNames();
  }

  try {
    const vt = doc.startViewTransition(() => update());
    void vt.finished.finally(clearSharedNames);
  } catch {
    clearSharedNames();
    void update();
  }
}
