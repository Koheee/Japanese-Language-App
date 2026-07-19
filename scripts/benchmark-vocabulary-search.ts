import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

import type { ResolvedVocabularyItem } from '../src/models/vocabulary';
import { filterResolvedVocabulary } from '../src/services/vocabularyResolver';
import { normalizeVocabularyComparison, normalizeVocabularySearch } from '../src/services/vocabularyText';

export const buildBenchmarkRecords = (count: number): ResolvedVocabularyItem[] => {
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('Benchmark record count must be a non-negative integer');
  return Array.from({ length: count }, (_, index) => {
    const suffix = String(index).padStart(5, '0');
    const japanese = `\u30d9\u30f3\u30c1\u30de\u30fc\u30af${suffix}`;
    const reading = `\u3079\u3093\u3061\u307e\u30fc\u304f${suffix}`;
    const english = `invented-${suffix}`;
    const category = `benchmark-group-${index % 20}`;
    return {
      lessonId: `lesson-${String((index % 25) + 1).padStart(2, '0')}`,
      item: {
        id: `benchmark:${suffix}`,
        japanese,
        reading,
        english,
        partOfSpeech: 'vocabulary',
        category,
        source: 'custom',
      },
      source: 'custom',
      editable: true,
      hidden: false,
      sortKey: `benchmark:${suffix}`,
      normalizedJapanese: normalizeVocabularyComparison(japanese),
      normalizedSearch: [japanese, reading, english, category]
        .map(normalizeVocabularySearch)
        .join('\u001f'),
    };
  });
};

export const percentile95 = (durations: readonly number[]): number => {
  if (!durations.length || durations.some((duration) => !Number.isFinite(duration) || duration < 0)) {
    throw new Error('Benchmark durations must contain non-negative finite values');
  }
  const sorted = [...durations].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * 0.95) - 1]!;
};

const assertSelfTest = (condition: unknown): void => {
  if (!condition) throw new Error('Vocabulary benchmark self-test failed');
};

const runSelfTest = (): void => {
  const records = buildBenchmarkRecords(2_000);
  assertSelfTest(records.length === 2_000);
  assertSelfTest(filterResolvedVocabulary(records, 'invented-01999').length === 1);
  assertSelfTest(percentile95([5, 1, 4, 2, 3]) === 5);
  process.stdout.write('Vocabulary benchmark self-test PASS\n');
};

const runBenchmark = (): void => {
  const records = buildBenchmarkRecords(2_000);
  for (let iteration = 0; iteration < 20; iteration += 1) {
    filterResolvedVocabulary(records, `invented-${String(iteration * 97).padStart(5, '0')}`);
  }

  const durations: number[] = [];
  for (let iteration = 0; iteration < 100; iteration += 1) {
    const startedAt = performance.now();
    filterResolvedVocabulary(records, `invented-${String(iteration * 19).padStart(5, '0')}`);
    durations.push(performance.now() - startedAt);
  }
  const p95 = percentile95(durations);
  process.stdout.write(`2,000 records; p95=${p95.toFixed(2)}ms; limit=100ms\n`);
  if (p95 >= 100) process.exitCode = 1;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.slice(2).includes('--self-test')) runSelfTest();
  else runBenchmark();
}
