import { describe, expect, it } from 'vitest';
import { runAllQuoteCases } from './quoteCases';

describe('Quote & GST Engine Invariants', () => {
  const cases = runAllQuoteCases();
  for (const c of cases) {
    it(`${c.id}: ${c.name}`, () => {
      expect(c.passed, c.detail).toBe(true);
    });
  }
});
