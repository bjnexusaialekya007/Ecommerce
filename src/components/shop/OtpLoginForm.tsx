import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export function OtpLoginForm({
  role,
  title,
  subtitle,
  defaultEmail = '',
  onVerified,
}: {
  role: 'admin' | 'wholesale';
  title: string;
  subtitle: string;
  defaultEmail?: string;
  onVerified: (result: { email: string }) => void;
}) {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState(defaultEmail);
  const [otp, setOtp] = useState('');
  const [devHint, setDevHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const sendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.requestOtp({ email: email.trim(), role });
      setDevHint(res.devOtpHint);
      setStep('otp');
      setCooldown(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.verifyOtp({ email: email.trim(), otp: otp.trim(), role });
      onVerified({ email: res.email });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-[var(--border-soft)]/70 bg-[var(--surface)] p-6 shadow-[var(--sh-1)] space-y-4">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-[var(--ink)]">{title}</h1>
        <p className="text-sm text-[var(--ink-muted)]">{subtitle}</p>
      </div>

      {step === 'email' ? (
        <form onSubmit={sendOtp} className="space-y-4">
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={role === 'admin' ? 'admin@bikanerheritage.in' : 'buyer@kiranamart.in'}
            error={error}
            required
          />
          <Button type="submit" variant="primary" fullWidth loading={loading}>
            Send 6-digit code
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          <p className="text-sm text-[var(--ink-muted)]">
            Code sent to <strong className="text-[var(--ink)]">{email}</strong>.{' '}
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setOtp('');
                setError('');
              }}
              className="text-[var(--primary)] underline underline-offset-2"
            >
              Change email
            </button>
          </p>

          {devHint && (
            <div className="rounded-xl border border-[var(--warn-ink)]/25 bg-[var(--warn-bg)] px-3 py-2 text-xs text-[var(--warn-ink)]">
              <span className="font-bold">DEV preview code:</span> <code className="font-mono font-bold">{devHint}</code>
            </div>
          )}

          <Input
            label="6-digit verification code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            error={error}
            className="tabular-nums tracking-[0.3em] text-center font-bold text-lg"
            required
          />

          <Button type="submit" variant="primary" fullWidth loading={loading}>
            Verify & sign in
          </Button>

          <div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
            <span>Didn&apos;t receive it?</span>
            <button
              type="button"
              disabled={cooldown > 0 || loading}
              onClick={() => sendOtp()}
              className="font-semibold text-[var(--primary)] disabled:opacity-45 min-h-[44px] px-2"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
