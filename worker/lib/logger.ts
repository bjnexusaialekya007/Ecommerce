// Structured JSON logger with PII redaction. Never log request bodies.
const PII_KEYS = /name|phone|email|address|gstin|pincode|otp|token|secret|signature|password|authorization|cookie/i;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = PII_KEYS.test(k) ? '[redacted]' : redact(v, depth + 1);
  }
  return out;
}

export function log(level: 'info' | 'warn' | 'error', msg: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...(redact(fields) as object) });
  (level === 'error' ? console.error : console.log)(line);
}
