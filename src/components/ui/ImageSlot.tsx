import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { useDevSimStore } from '../../dev/simStore';

export function ImageSlot({
  src,
  alt,
  label,
  aspect = '4/3',
  priority = false,
  lqip,
  sharedProductImage = false,
  viewTransitionHero = false,
  className = '',
}: {
  src: string | null | undefined;
  alt: string;
  label: string;
  aspect?: '4/3' | '4/5' | '1/1';
  priority?: boolean;
  lqip?: string;
  sharedProductImage?: boolean;
  viewTransitionHero?: boolean;
  className?: string;
}) {
  const slowImages = useDevSimStore((s) => s.slowImages);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [delayedSrc, setDelayedSrc] = useState<string | null>(slowImages ? null : src || null);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    if (!src) {
      setDelayedSrc(null);
      return;
    }
    if (!slowImages) {
      setDelayedSrc(src);
      return;
    }
    const t = window.setTimeout(() => setDelayedSrc(src), 1800);
    return () => window.clearTimeout(t);
  }, [src, slowImages]);

  const aspectClass =
    aspect === '4/5' ? 'aspect-[4/5]' : aspect === '1/1' ? 'aspect-square' : 'aspect-[4/3]';

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (typeof img.decode === 'function') {
      img
        .decode()
        .catch(() => {})
        .finally(() => setLoaded(true));
    } else {
      setLoaded(true);
    }
  };

  return (
    <div
      data-product-image={sharedProductImage ? '1' : undefined}
      style={{
        ...(lqip ? { backgroundImage: `url(${lqip})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
        ...(viewTransitionHero ? { viewTransitionName: 'product-image' } : {}),
      }}
      className={`relative overflow-hidden rounded-lg bg-[var(--surface-2)] outline outline-1 -outline-offset-1 outline-black/10 ${aspectClass} ${className}`}
    >
      {!delayedSrc || failed ? (
        <div className="h-full w-full flex flex-col items-center justify-center p-4 text-center gap-2">
          <Package className="h-7 w-7 text-[var(--ink-muted)]" aria-hidden="true" />
          <span className="text-xs font-medium text-[var(--ink-muted)] line-clamp-2">{label}</span>
        </div>
      ) : (
        <>
          {!loaded && !lqip && <div className="skel absolute inset-0" aria-hidden="true" />}
          <img
            src={delayedSrc}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            referrerPolicy="no-referrer"
            width={800}
            height={aspect === '4/5' ? 1000 : aspect === '1/1' ? 800 : 600}
            onLoad={handleLoad}
            onError={() => setFailed(true)}
            className={`h-full w-full object-cover transition-opacity duration-200 ease-[var(--ease-out)] ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </>
      )}
    </div>
  );
}
