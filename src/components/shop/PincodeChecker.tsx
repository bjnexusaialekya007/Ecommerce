import { useState } from 'react';
import { CheckCircle2, MapPin, AlertTriangle } from 'lucide-react';
import type { ClientConfig } from '../../config/schema';
import { formatINR } from '../../shared/money';
import { computeDispatchDateIst, formatIstDateDisplay } from '../../shared/calendar';
import { buildWhatsAppUrl, isPlaceholder } from '../../shared/whatsapp';
import { useUiStore } from '../../stores/ui';
import { track } from '../../analytics/track';
import { Button } from '../ui/Button';
import { PincodeInput } from '../ui/Input';

export function PincodeChecker({
  config,
  weightG = 500,
  onChecked,
}: {
  config: ClientConfig;
  weightG?: number;
  onChecked?: (pincode: string) => void;
}) {
  const lastPincode = useUiStore((s) => s.lastPincode);
  const setLastPincode = useUiStore((s) => s.setLastPincode);
  const [pin, setPin] = useState(lastPincode || '');
  const [checkedPin, setCheckedPin] = useState<string | null>(lastPincode && /^\d{6}$/.test(lastPincode) ? lastPincode : null);
  const [error, setError] = useState('');

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pin.trim();
    if (!/^\d{6}$/.test(clean)) {
      setError('Enter a valid 6-digit Indian pincode.');
      return;
    }
    setError('');
    setLastPincode(clean);
    setCheckedPin(clean);
    onChecked?.(clean);

    const localZone = config.zones.find((z) => z.pincodes.includes(clean));
    const resultType = clean.startsWith('0') ? 'not_serviceable' : localZone ? 'local' : 'courier';
    track('pincode_check', { result: resultType }, config);
  };

  const localZone = checkedPin ? config.zones.find((z) => z.pincodes.includes(checkedPin)) : undefined;
  const unserviceable = checkedPin ? checkedPin.startsWith('0') : false;
  const courierRate = config.shippingRates.find((r) => weightG >= r.minWeightG && weightG <= r.maxWeightG);
  const dispatchDate = formatIstDateDisplay(computeDispatchDateIst(new Date(), config));
  const waUrl = buildWhatsAppUrl('general', { pincode: checkedPin || '' }, config);

  return (
    <div className="rounded-xl border border-[var(--border-soft)]/70 bg-[var(--surface-2)] p-4 space-y-3">
      <form onSubmit={handleCheck} className="flex flex-col sm:flex-row sm:items-end gap-2">
        <div className="flex-1">
          <PincodeInput
            label="Check delivery to your pincode"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="e.g. 500012 or 400001"
            error={error}
          />
        </div>
        <Button type="submit" variant="primary" className="shrink-0">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          Check
        </Button>
      </form>

      {checkedPin && (
        <div aria-live="polite" className="text-sm">
          {unserviceable ? (
            <div className="flex flex-col gap-2 rounded-lg bg-[var(--warn-bg)] px-3 py-2.5 text-[var(--warn-ink)]">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Pincode {checkedPin} is currently unserviceable online. Store pickup is available, or contact us directly.
                </span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs font-semibold">
                {!isPlaceholder(config.contact.phone) && (
                  <a href={`tel:${config.contact.phone.replace(/\s+/g, '')}`} className="underline">
                    Call {config.contact.phone}
                  </a>
                )}
                {waUrl && (
                  <a href={waUrl} target="_blank" rel="noopener noreferrer" className="underline">
                    Ask on WhatsApp
                  </a>
                )}
              </div>
            </div>
          ) : localZone ? (
            <div className="flex items-start gap-2 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] px-3 py-2.5 text-[var(--on-secondary-fixed)]">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[var(--accent)]" aria-hidden="true" />
              <div className="space-y-0.5">
                <p className="font-semibold">
                  Same-day / next-day local delivery to {checkedPin} ({localZone.name})
                </p>
                <p className="text-xs text-[var(--on-secondary-container)] tabular-nums">
                  Same/next day local route · Fee {formatINR(localZone.feePaise)}
                  {localZone.freeAbovePaise ? ` (Free above ${formatINR(localZone.freeAbovePaise)})` : ''}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-lg bg-[var(--accent-soft)]/70 border border-[var(--accent-border)] px-3 py-2.5 text-[var(--on-secondary-fixed)]">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[var(--accent)]" aria-hidden="true" />
              <div className="space-y-0.5">
                <p className="font-semibold">All-India insured courier to {checkedPin}</p>
                <p className="text-xs text-[var(--on-secondary-container)] tabular-nums">
                  Dispatched by {dispatchDate}
                  {courierRate ? ` · ${formatINR(courierRate.feePaise)} for this pack (${courierRate.freeAbovePaise ? `Free above ${formatINR(courierRate.freeAbovePaise)}` : 'tracked'})` : ''}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
