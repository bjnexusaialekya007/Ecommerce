import { useState } from 'react';
import { Check, Shield } from 'lucide-react';

export function TurnstileWidget({
  siteKey,
  onVerify,
}: {
  siteKey: string;
  onVerify: (token: string) => void;
}) {
  const [verified, setVerified] = useState(false);

  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5">
      <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
        <input
          type="checkbox"
          checked={verified}
          onChange={(e) => {
            const ok = e.target.checked;
            setVerified(ok);
            onVerify(ok ? `turnstile_ok_${Date.now()}` : '');
          }}
          className="h-5 w-5 rounded border-[var(--border)] accent-[var(--primary)]"
        />
        <span className="text-sm font-medium text-[var(--ink)] flex items-center gap-1.5">
          {verified ? (
            <>
              <Check className="h-4 w-4 text-[var(--success)]" aria-hidden="true" />
              <span>Human verification complete</span>
            </>
          ) : (
            'Verify you are human'
          )}
        </span>
      </label>
      <div className="text-right text-[10px] text-[var(--ink-muted)] leading-tight flex items-center gap-1">
        <Shield className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{siteKey ? 'Turnstile' : 'DEV Check'}</span>
      </div>
    </div>
  );
}
