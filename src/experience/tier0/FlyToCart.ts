let activeClone: HTMLElement | null = null;
let activeAnim: Animation | null = null;

function isVisibleBox(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.bottom >= 0 && r.top <= window.innerHeight;
}

function findCartTarget(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const candidates = document.querySelectorAll<HTMLElement>('[data-cart-target]');
  for (const el of candidates) {
    if (isVisibleBox(el)) return el;
  }
  return candidates[0] || null;
}

function triggerBadgeFeedback(spatial: boolean): void {
  if (typeof document === 'undefined') return;
  const badges = document.querySelectorAll<HTMLElement>('[data-cart-badge]');
  for (const badge of badges) {
    if (!isVisibleBox(badge)) continue;
    if (!spatial || typeof badge.animate !== 'function') {
      badge.classList.remove('badge-pulse');
      void badge.offsetWidth;
      badge.classList.add('badge-pulse');
      continue;
    }
    badge.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.18)' },
        { transform: 'scale(1)' },
      ],
      { duration: 160, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    );
  }
}

export function flyToCart(opts: {
  sourceEl?: HTMLElement | null;
  imageUrl?: string | null;
  fxEnabled?: boolean;
  reducedMotion?: boolean;
}): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  // One flight at a time: cancel previous immediately
  if (activeAnim) {
    try {
      activeAnim.cancel();
    } catch {
      // ignore
    }
    activeAnim = null;
  }
  if (activeClone) {
    activeClone.remove();
    activeClone = null;
  }

  const reduced =
    opts.reducedMotion ?? (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  const fxOn = opts.fxEnabled !== false && document.documentElement.dataset.fx !== 'off';

  if (reduced || !fxOn) {
    triggerBadgeFeedback(false);
    return;
  }

  const targetEl = findCartTarget();
  const sourceRect = opts.sourceEl?.getBoundingClientRect();
  if (!targetEl || !sourceRect || typeof document.documentElement.animate !== 'function') {
    triggerBadgeFeedback(true);
    return;
  }

  const targetRect = targetEl.getBoundingClientRect();
  const size = 48;
  const startX = sourceRect.left + sourceRect.width / 2 - size / 2;
  const startY = sourceRect.top + sourceRect.height / 2 - size / 2;
  const endX = targetRect.left + targetRect.width / 2 - size / 2;
  const endY = targetRect.top + targetRect.height / 2 - size / 2;

  const clone = document.createElement('div');
  clone.setAttribute('aria-hidden', 'true');
  clone.style.cssText =
    'position:fixed;left:0;top:0;width:48px;height:48px;border-radius:12px;overflow:hidden;pointer-events:none;z-index:90;will-change:transform,opacity;background:var(--primary);border:2px solid var(--surface);';

  if (opts.imageUrl) {
    const img = document.createElement('img');
    img.src = opts.imageUrl;
    img.alt = '';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
    clone.appendChild(img);
  }

  document.body.appendChild(clone);
  activeClone = clone;

  const anim = clone.animate(
    [
      { transform: `translate3d(${startX}px, ${startY}px, 0) scale(1)`, opacity: 1 },
      { transform: `translate3d(${endX}px, ${endY}px, 0) scale(0.2)`, opacity: 0.3 },
    ],
    {
      duration: 420,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards',
    }
  );
  activeAnim = anim;

  const cleanup = () => {
    if (activeClone === clone) {
      clone.remove();
      activeClone = null;
      activeAnim = null;
    } else {
      clone.remove();
    }
  };

  anim.onfinish = () => {
    cleanup();
    triggerBadgeFeedback(true);
  };
  anim.oncancel = cleanup;
}
