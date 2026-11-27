import { useEffect, useRef } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { prepareSharedProductImage } from './transitions';

export interface PrefetchLogEntry {
  url: string;
  source: 'intent' | 'idle';
  at: number;
}

const MAX_INFLIGHT = 4;
const BLOCKED_PREFIXES = ['/checkout', '/cart', '/admin', '/order', '/invoice', '/wholesale/login', '/wholesale/register'];

const prefetchedUrls = new Set<string>();
const inflightUrls = new Set<string>();
const prefetchLog: PrefetchLogEntry[] = [];

export function getPrefetchLog(): PrefetchLogEntry[] {
  return [...prefetchLog];
}

export function clearPrefetchLog(): void {
  prefetchLog.length = 0;
  prefetchedUrls.clear();
}

export function canPrefetchNetwork(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  if (document.documentElement.dataset.fx === 'off') return false;
  if (document.documentElement.dataset.prefetch === 'off') return false;

  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn?.saveData) return false;
  if (conn?.effectiveType && conn.effectiveType !== '4g') return false;
  return true;
}

function preloadCustomerRoute(url: string): Promise<void> | null {
  if (url === '/shop' || url.startsWith('/shop?')) {
    return import('../../routes/customer/ShopPage').then(() => undefined);
  }
  if (url.startsWith('/c/')) {
    return import('../../routes/customer/CategoryPage').then(() => undefined);
  }
  if (url.startsWith('/p/')) {
    const slug = url.slice(3).split(/[?#]/)[0];
    return Promise.all([
      import('../../routes/customer/ProductPage'),
      slug ? import('../../api').then((m) => m.api.getProductBySlug(slug).catch(() => null)) : Promise.resolve(null),
    ]).then(() => undefined);
  }
  if (url === '/track') return import('../../routes/customer/TrackPage').then(() => undefined);
  if (url === '/wholesale') return import('../../routes/customer/WholesalePages').then(() => undefined);
  if (url === '/about' || url === '/contact' || url === '/faq') {
    return import('../../routes/customer/InfoPages').then(() => undefined);
  }
  return null;
}

export function triggerPrefetch(url: string, source: 'intent' | 'idle'): boolean {
  if (!url.startsWith('/')) return false;
  if (BLOCKED_PREFIXES.some((prefix) => url.startsWith(prefix))) return false;
  if (!canPrefetchNetwork()) return false;
  if (prefetchedUrls.has(url) || inflightUrls.has(url)) return false;
  if (inflightUrls.size >= MAX_INFLIGHT) return false;

  const task = preloadCustomerRoute(url);
  if (!task) return false;

  inflightUrls.add(url);
  prefetchLog.unshift({ url, source, at: Date.now() });
  if (prefetchLog.length > 15) prefetchLog.length = 15;

  task
    .then(() => {
      prefetchedUrls.add(url);
    })
    .catch(() => {})
    .finally(() => {
      inflightUrls.delete(url);
    });

  return true;
}

export interface PrefetchLinkProps extends LinkProps {
  sharedProductImage?: boolean;
}

export function PrefetchLink({
  to,
  sharedProductImage = false,
  onPointerDown,
  onTouchStart,
  onClick,
  viewTransition,
  children,
  ...rest
}: PrefetchLinkProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const href = typeof to === 'string' ? to : `${to.pathname || ''}${to.search || ''}`;

  useEffect(() => {
    const el = linkRef.current;
    if (!el || !href || typeof IntersectionObserver === 'undefined') return;
    if (!canPrefetchNetwork()) return;

    let idleId = 0;
    let timerId = 0;
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number })
      .requestIdleCallback;
    const cic = (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        io.disconnect();
        if (!canPrefetchNetwork()) return;
        if (ric) {
          idleId = ric(() => void triggerPrefetch(href, 'idle'), { timeout: 1500 });
        } else {
          timerId = window.setTimeout(() => void triggerPrefetch(href, 'idle'), 120);
        }
      },
      { rootMargin: '120px' }
    );
    io.observe(el);

    return () => {
      io.disconnect();
      if (idleId && cic) cic(idleId);
      if (timerId) window.clearTimeout(timerId);
    };
  }, [href]);

  const fxActive =
    typeof document !== 'undefined' &&
    document.documentElement.dataset.fx !== 'off' &&
    !(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  return (
    <Link
      ref={linkRef}
      to={to}
      viewTransition={viewTransition ?? fxActive}
      onPointerDown={(e) => {
        triggerPrefetch(href, 'intent');
        onPointerDown?.(e);
      }}
      onTouchStart={(e) => {
        triggerPrefetch(href, 'intent');
        onTouchStart?.(e);
      }}
      onClick={(e) => {
        if (sharedProductImage) {
          prepareSharedProductImage(e.currentTarget, fxActive);
        }
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}
