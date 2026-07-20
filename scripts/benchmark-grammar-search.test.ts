import { describe, expect, it } from 'vitest';

import { runGrammarSearchBenchmark } from './benchmark-grammar-search';

describe('grammar search benchmark harness', () => {
  it('measures the complete logical corpus and at least 100 warm queries', () => {
    const result = runGrammarSearchBenchmark(100);

    expect(result.documentCount).toBe(274);
    expect(result.queryCount).toBeGreaterThanOrEqual(100);
    expect(result.indexMilliseconds).toBeGreaterThanOrEqual(0);
    expect(result.slowestQueryMilliseconds).toBeGreaterThanOrEqual(0);
  });
});

