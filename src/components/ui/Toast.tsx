import { useEffect } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { X } from 'lucide-react';
import { EASE_OUT, MOTION_DURATIONS } from '../../shared/motion';
import { useUiStore, type ToastItem } from '../../stores/ui';

function SingleToast({ item }: { item: ToastItem }) {
  const dismiss = useUiStore((s) => s.dismissToast);

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(item.id), 4500);
    return () => window.clearTimeout(timer);
  }, [item.id, dismiss]);

  const toneStyle =
    item.tone === 'danger'
      ? 'bg-[var(--danger)] text-white'
      : item.tone === 'success'
      ? 'bg-[var(--success)] text-white'
      : 'bg-[var(--ink)] text-white';

  return (
    <m.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: MOTION_DURATIONS.fast, ease: EASE_OUT }}
      role="status"
      aria-live="polite"
      className={`toast-item pointer-events-auto flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm shadow-[var(--sh-2)] ${toneStyle}`}
    >
      <span>{item.message}</span>
      <div className="flex items-center gap-2 shrink-0">
        {item.undoAction && (
          <button
            type="button"
            onClick={() => {
              item.undoAction?.();
              dismiss(item.id);
            }}
            className="font-bold underline px-2 py-1"
          >
            Undo
          </button>
        )}
        <button
          type="button"
          onClick={() => dismiss(item.id)}
          aria-label="Dismiss notification"
          className="p-1 opacity-80 hover:opacity-100"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </m.div>
  );
}

export function ToastContainer() {
  const toasts = useUiStore((s) => s.toasts);
  return (
    <div className="no-print pointer-events-none fixed bottom-[calc(var(--cartbar-h)+var(--bottomnav-h)+16px+env(safe-area-inset-bottom))] left-4 right-4 md:left-auto md:right-6 md:w-96 z-60 flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <SingleToast key={t.id} item={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}
