import React, { useId } from 'react';

interface FieldWrapperProps {
  label: string;
  helper?: string;
  error?: string;
  required?: boolean;
  htmlFor: string;
  children: React.ReactNode;
}

function FieldWrapper({ label, helper, error, required, htmlFor, children }: FieldWrapperProps) {
  const errId = `${htmlFor}-err`;
  const helpId = `${htmlFor}-help`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-[var(--ink)]">
        {label}
        {required && <span className="text-[var(--danger)] ml-0.5" aria-hidden="true">*</span>}
      </label>
      {children}
      {helper && !error && (
        <p id={helpId} className="text-xs text-[var(--ink-muted)]">
          {helper}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" aria-live="polite" className="text-xs font-medium text-[var(--danger)]">
          {error}
        </p>
      )}
    </div>
  );
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helper?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helper, error, required, className = '', id: propId, ...rest },
  ref
) {
  const autoId = useId();
  const id = propId || autoId;
  const describedBy = error ? `${id}-err` : helper ? `${id}-help` : undefined;

  return (
    <FieldWrapper label={label} helper={helper} error={error} required={required} htmlFor={id}>
      <input
        ref={ref}
        id={id}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`w-full min-h-[44px] rounded-xl border bg-[var(--surface-2)] focus:bg-[var(--surface)] px-3.5 py-2.5 text-base text-[var(--ink)] placeholder:text-[var(--ink-muted)]/65 transition-colors ${
          error ? 'border-[var(--danger)]' : 'border-[var(--border)] focus:border-[var(--primary)]'
        } ${className}`}
        {...rest}
      />
    </FieldWrapper>
  );
});

export interface PhoneInputProps extends Omit<InputProps, 'type' | 'inputMode'> {
  value: string;
  onValueChange?: (digits: string) => void;
}

export function PhoneInput({
  label,
  helper,
  error,
  required,
  value,
  onValueChange,
  onChange,
  id: propId,
  ...rest
}: PhoneInputProps) {
  const autoId = useId();
  const id = propId || autoId;
  const describedBy = error ? `${id}-err` : helper ? `${id}-help` : undefined;

  return (
    <FieldWrapper label={label} helper={helper} error={error} required={required} htmlFor={id}>
      <div className="flex">
        <span className="inline-flex min-h-[44px] items-center rounded-l-xl border border-r-0 border-[var(--border)] bg-[var(--surface-high)] px-3 text-sm font-semibold text-[var(--ink-muted)] tabular-nums">
          +91
        </span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={10}
          required={required}
          value={value}
          onChange={(e) => {
            const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
            onValueChange?.(clean);
            if (onChange) {
              const synth = { ...e, target: { ...e.target, value: clean } } as React.ChangeEvent<HTMLInputElement>;
              onChange(synth);
            }
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`w-full min-h-[44px] rounded-r-xl border bg-[var(--surface-2)] focus:bg-[var(--surface)] px-3.5 py-2.5 text-base tabular-nums text-[var(--ink)] transition-colors ${
            error ? 'border-[var(--danger)]' : 'border-[var(--border)] focus:border-[var(--primary)]'
          }`}
          {...rest}
        />
      </div>
    </FieldWrapper>
  );
}

export interface PincodeInputProps extends Omit<InputProps, 'type' | 'inputMode'> {
  value: string;
  onValueChange?: (digits: string) => void;
}

export function PincodeInput({
  label,
  helper,
  error,
  required,
  value,
  onValueChange,
  onChange,
  ...rest
}: PincodeInputProps) {
  return (
    <Input
      label={label}
      helper={helper}
      error={error}
      required={required}
      type="text"
      inputMode="numeric"
      autoComplete="postal-code"
      maxLength={6}
      value={value}
      onChange={(e) => {
        const clean = e.target.value.replace(/\D/g, '').slice(0, 6);
        onValueChange?.(clean);
        if (onChange) {
          const synth = { ...e, target: { ...e.target, value: clean } } as React.ChangeEvent<HTMLInputElement>;
          onChange(synth);
        }
      }}
      className="tabular-nums"
      {...rest}
    />
  );
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  helper?: string;
  error?: string;
  options?: Array<{ value: string; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, helper, error, required, className = '', id: propId, options, children, ...rest },
  ref
) {
  const autoId = useId();
  const id = propId || autoId;
  return (
    <FieldWrapper label={label} helper={helper} error={error} required={required} htmlFor={id}>
      <select
        ref={ref}
        id={id}
        required={required}
        aria-invalid={Boolean(error)}
        className={`w-full min-h-[44px] rounded-xl border bg-[var(--surface-2)] focus:bg-[var(--surface)] px-3.5 py-2.5 text-base text-[var(--ink)] transition-colors ${
          error ? 'border-[var(--danger)]' : 'border-[var(--border)] focus:border-[var(--primary)]'
        } ${className}`}
        {...rest}
      >
        {options
          ? options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))
          : children}
      </select>
    </FieldWrapper>
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  helper?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, helper, error, required, className = '', id: propId, ...rest },
  ref
) {
  const autoId = useId();
  const id = propId || autoId;
  return (
    <FieldWrapper label={label} helper={helper} error={error} required={required} htmlFor={id}>
      <textarea
        ref={ref}
        id={id}
        required={required}
        aria-invalid={Boolean(error)}
        className={`w-full rounded-xl border bg-[var(--surface-2)] focus:bg-[var(--surface)] px-3.5 py-2.5 text-base text-[var(--ink)] placeholder:text-[var(--ink-muted)]/65 transition-colors ${
          error ? 'border-[var(--danger)]' : 'border-[var(--border)] focus:border-[var(--primary)]'
        } ${className}`}
        {...rest}
      />
    </FieldWrapper>
  );
});
