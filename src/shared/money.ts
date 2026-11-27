const inrExact = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrWhole = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Formats integer paise to Indian Rupee string (`₹1,23,456.50` or compact `₹459`).
 * Never uses floating point arithmetic on money.
 */
export function formatINR(paise: number, compactZero = true): string {
  const safe = Math.round(paise);
  if (compactZero && safe % 100 === 0) {
    return inrWhole.format(safe / 100);
  }
  return inrExact.format(safe / 100);
}

/**
 * ONLY allowed decimal rupee conversion (Section G3 analytics only).
 */
export function paiseToRupees(paise: number): number {
  return Math.round(paise) / 100;
}

/**
 * Informational unit price per 100 g rounded half-up to whole paise (Section K1 #3).
 */
export function unitPricePer100gPaise(retailPaise: number, netWeightG: number): number {
  if (netWeightG <= 0) return 0;
  return Math.round((retailPaise * 100) / netWeightG);
}

export function formatWeight(grams: number): string {
  if (grams >= 1000 && grams % 1000 === 0) {
    return `${grams / 1000}\u00A0kg`;
  }
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2).replace(/\.00$/, '')}\u00A0kg`;
  }
  return `${grams}\u00A0g`;
}

export function validateIndianPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone.trim());
}

export function formatIndianPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) return phone;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

const GSTIN_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Validates 15-character Indian GSTIN format and Mod-36 check digit.
 */
export function validateGSTIN(gstin: string): boolean {
  const code = gstin.trim().toUpperCase();
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(code)) {
    return false;
  }
  let factor = 2;
  let sum = 0;
  for (let i = 13; i >= 0; i--) {
    const cp = GSTIN_ALPHABET.indexOf(code[i]);
    if (cp === -1) return false;
    let digit = factor * cp;
    factor = factor === 2 ? 1 : 2;
    digit = Math.floor(digit / 36) + (digit % 36);
    sum += digit;
  }
  const checkIndex = (36 - (sum % 36)) % 36;
  return GSTIN_ALPHABET[checkIndex] === code[14];
}
