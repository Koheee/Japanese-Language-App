import { describe, expect, it } from 'vitest';

import {
  findPrivateCanaryLeaks,
  formatPrivateCanaryCoverage,
  scanPrivateCanaries,
} from './assert-public-artifact-safe';

const shortPrivateFile = {
  records: [{
    item: {
      id: 'personal-deck:lesson-01:short-1',
      sourceId: 'L01-short-1',
      japanese: '\u9020\u8a9e\u56db\u5b57',
      reading: '\u304d\u305e\u3046\u3054',
      english: 'privword',
      category: 'kind',
    },
  }],
};

describe('public artifact private canaries', () => {
  it('detects every non-colliding text field of at least four characters in Metro literals', () => {
    const bundle = [
      "const english='privword';",
      'const category="kind";',
      "const japanese='\\u9020\\u8a9e\\u56db\\u5b57';",
      'const reading="\\u304D\\u305E\\u3046\\u3054";',
    ].join('');

    expect(findPrivateCanaryLeaks(
      shortPrivateFile,
      JSON.stringify({ vocabulary: [] }),
      [{ path: 'dist/_expo/static/js/app.js', content: bundle }],
    )).toBe(4);
  });

  it('separates tracked and reviewed-runtime collisions while scanning every other eligible value', () => {
    const bundle = [
      "const english='privword';",
      'const category="kind";',
      "const japanese='\\u9020\\u8a9e\\u56db\\u5b57';",
      'const reading="\\u304D\\u305E\\u3046\\u3054";',
    ].join('');
    const scan = scanPrivateCanaries(
      shortPrivateFile,
      `A legitimate public lesson uses \u9020\u8a9e\u56db\u5b57 in context.`,
      [{ path: 'dist/_expo/static/js/app.js', content: bundle }],
      [{ path: 'node_modules/runtime/index.js', content: "const word='privword';const type=\"kind\";" }],
    );

    expect(scan).toEqual({
      recordCount: 1,
      identityCanaryCount: 2,
      recordsWithEligibleTextFields: 1,
      eligibleTextFieldCount: 4,
      uniqueTextCanaryCount: 4,
      trackedPublicCollisionCount: 1,
      runtimePublicCollisionCount: 2,
      scannedNonCollidingTextCanaryCount: 1,
      identityLeakCount: 0,
      textLeakCount: 1,
      leakCount: 1,
    });
    expect(formatPrivateCanaryCoverage(scan)).toBe(
      'Private canary coverage: identity=2; records-with-eligible-text=1/1; eligible-text-fields=4; unique-text=4; tracked-collisions=1; runtime-collisions=2; scanned-noncolliding-text=1',
    );
    expect(formatPrivateCanaryCoverage(scan)).not.toContain('privword');
  });

  it('reports records whose text fields are all shorter than four characters', () => {
    const scan = scanPrivateCanaries(
      {
        records: [{
          item: {
            id: 'personal-deck:lesson-01:short-2',
            sourceId: 'L01-short-2',
            japanese: '\u4eba',
            reading: '\u3072\u3068',
            english: 'one',
            category: 'n',
          },
        }],
      },
      '',
      [],
      [],
    );

    expect(scan.recordsWithEligibleTextFields).toBe(0);
    expect(scan.eligibleTextFieldCount).toBe(0);
    expect(formatPrivateCanaryCoverage(scan)).toContain('records-with-eligible-text=0/1');
  });
});
