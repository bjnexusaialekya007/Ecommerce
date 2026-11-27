import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const base =
    'pressable inline-flex items-center justify-center gap-2 font-medium rounded-xl whitespace-nowrap shrink-0 transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeClass =
    size === 'lg'
      ? 'min-h-[52px] px-6 py-3 text-base'
      : size === 'sm'
      ? 'min-h-[38px] px-3 py-1.5 text-xs'
      : 'min-h-[44px] px-4 py-2.5 text-sm';

  const variantMap: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-[var(--sh-1)]',
    secondary: 'bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--border)] hover:bg-[var(--surface-high)]',
    ghost: 'bg-transparent text-[var(--ink)] hover:bg-[var(--surface-2)]',
    danger: 'bg-[var(--danger)] text-white',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${base} ${sizeClass} ${variantMap[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export function IconButton({ label, className = '', children, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`pressable inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors duration-[var(--dur-fast)] ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
