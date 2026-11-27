import React, { useEffect, useRef } from 'react';
import { AnimatePresence, m, type PanInfo } from 'motion/react';
import { X } from 'lucide-react';
import { EASE_OUT, MOTION_DURATIONS, SHEET_SPRING } from '../../shared/motion';
import { IconButton } from './Button';

export function BottomSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKey);
      // Focus sheet container for keyboard/screen reader accessibility
      requestAnimationFrame(() => sheetRef.current?.focus());

      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener('keydown', handleKey);
        triggerRef.current?.focus?.();
      };
    }
  }, [open, onClose]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 500) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: MOTION_DURATIONS.fast, ease: EASE_OUT }}
            className="fixed inset-0 bg-black/45"
            aria-hidden="true"
            onClick={onClose}
          />
          <m.div
            ref={sheetRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={SHEET_SPRING}
            drag="y"
            dragConstraints={{ top: 0, bottom: 260 }}
            dragElastic={{ top: 0.08, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
            className="sheet relative z-50 w-full md:max-w-lg max-h-[88dvh] overflow-y-auto rounded-t-[24px] md:rounded-2xl bg-[var(--surface)] border border-[var(--border-soft)]/70 p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-[var(--sh-2)] focus:outline-none"
          >
            <div className="md:hidden w-10 h-1 rounded-full bg-[var(--border-soft)] mx-auto mb-3" aria-hidden="true" />
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--border-soft)]">
              <h2 className="font-display text-lg font-bold text-[var(--ink)]">{title}</h2>
              <IconButton label="Close" onClick={onClose}>
                <X className="h-5 w-5" aria-hidden="true" />
              </IconButton>
            </div>
            <div className="pt-4">{children}</div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
