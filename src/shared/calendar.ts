import type { ClientConfig } from '../config/schema';

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function getIstDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getIstParts(date: Date): {
  dateStr: string;
  weekday: number;
  minutesOfDay: number;
  year: number;
  month: number;
} {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
  const year = Number(get('year'));
  const month = Number(get('month'));
  const day = get('day');
  const hour = Number(get('hour')) % 24;
  const minute = Number(get('minute'));
  const weekday = WEEKDAY_MAP[get('weekday')] ?? 0;
  return {
    dateStr: `${year}-${String(month).padStart(2, '0')}-${day}`,
    weekday,
    minutesOfDay: hour * 60 + minute,
    year,
    month,
  };
}

export function getFinancialYearCode(date: Date): string {
  const { year, month } = getIstParts(date);
  const fyStart = month >= 4 ? year : year - 1;
  return `${String(fyStart).slice(2)}-${String(fyStart + 1).slice(2)}`;
}

export function formatIstDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 6, 0, 0));
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(dt);
}

export function formatIstDateTimeDisplay(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(dt) + ' IST';
}

/**
 * Counts working days in IST, skipping weeklyOff and config.hours.holidays[] (A3.20).
 */
export function computeDispatchDateIst(now: Date, config: ClientConfig): string {
  const holidays = new Set(config.hours.holidays);
  const weeklyOff = new Set(config.hours.weeklyOff);
  let remaining = Math.max(1, config.dispatchDays);
  let cursor = new Date(now.getTime());

  // If ordered after close time, first working day starts next calendar day
  const startParts = getIstParts(cursor);
  const [closeH, closeM] = config.hours.closeTime.split(':').map(Number);
  if (startParts.minutesOfDay >= closeH * 60 + closeM) {
    cursor = new Date(cursor.getTime() + 86_400_000);
  }

  let safety = 0;
  while (remaining > 0 && safety < 60) {
    safety++;
    const p = getIstParts(cursor);
    if (!weeklyOff.has(p.weekday) && !holidays.has(p.dateStr)) {
      remaining--;
      if (remaining === 0) return p.dateStr;
    }
    cursor = new Date(cursor.getTime() + 86_400_000);
  }
  return getIstParts(cursor).dateStr;
}

export interface ShopStatusInfo {
  status: 'open' | 'busy' | 'closed';
  isOpenNow: boolean;
  reason: string;
  nextOpenText: string;
}

function parseHHMM(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}

function formatHHMM12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function getShopStatus(config: ClientConfig, now = new Date()): ShopStatusInfo {
  if (config.shopStatusMode === 'manual') {
    if (config.manualShopStatus === 'closed') {
      return {
        status: 'closed',
        isOpenNow: false,
        reason: config.manualStatusNote || `We are closed now. Opens at ${formatHHMM12(config.hours.openTime)}.`,
        nextOpenText: `${formatHHMM12(config.hours.openTime)} IST`,
      };
    }
    if (config.manualShopStatus === 'busy') {
      return {
        status: 'busy',
        isOpenNow: true,
        reason:
          config.manualStatusNote ||
          `High order volume${config.manualBusyMinutes ? ` (+${config.manualBusyMinutes} min)` : ''}.`,
        nextOpenText: 'Open now',
      };
    }
  }

  const p = getIstParts(now);
  const holidays = new Set(config.hours.holidays);
  const weeklyOff = new Set(config.hours.weeklyOff);
  const openMin = parseHHMM(config.hours.openTime);
  const closeMin = parseHHMM(config.hours.closeTime);

  if (holidays.has(p.dateStr) || weeklyOff.has(p.weekday)) {
    return {
      status: 'closed',
      isOpenNow: false,
      reason: `Closed today. Opens next working day at ${formatHHMM12(config.hours.openTime)} IST.`,
      nextOpenText: `Next working day ${formatHHMM12(config.hours.openTime)}`,
    };
  }

  // Supports overnight window if closeMin < openMin
  const withinHours =
    closeMin >= openMin
      ? p.minutesOfDay >= openMin && p.minutesOfDay < closeMin
      : p.minutesOfDay >= openMin || p.minutesOfDay < closeMin;

  if (!withinHours) {
    return {
      status: 'closed',
      isOpenNow: false,
      reason: `Closed now. Opens at ${formatHHMM12(config.hours.openTime)} IST.`,
      nextOpenText: `${formatHHMM12(config.hours.openTime)} IST`,
    };
  }

  return {
    status: 'open',
    isOpenNow: true,
    reason: 'Open now',
    nextOpenText: `Open until ${formatHHMM12(config.hours.closeTime)} IST`,
  };
}
