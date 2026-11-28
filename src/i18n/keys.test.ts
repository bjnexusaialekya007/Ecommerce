import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { en } from './en';

function walk(dir: string, acc: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else if (/\.tsx?$/.test(e.name) && !/\.test\./.test(e.name)) acc.push(full);
  }
  return acc;
}

describe('i18n keys', () => {
  it('every literal t("a.b") key used in src exists in en', () => {
    const missing: string[] = [];
    for (const f of walk('src')) {
      const code = fs.readFileSync(f, 'utf8');
      for (const m of code.matchAll(/(?<![\w.])t\(\s*['"]([a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)+)['"]/g)) {
        let cur: unknown = en;
        for (const part of m[1]!.split('.')) cur = cur && typeof cur === 'object' ? (cur as Record<string, unknown>)[part] : undefined;
        if (typeof cur !== 'string') missing.push(`${f}: ${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
