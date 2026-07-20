import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

import { lessons } from '../src/data/lessons';
import { buildSearchCorpus, searchLessons } from '../src/search/searchLessons';

const representativeQueries = ['より', 'permission', 'てから', 'カタカナ', 'comparison'];

export interface GrammarSearchBenchmarkResult {
  documentCount: number;
  queryCount: number;
  indexMilliseconds: number;
  slowestQueryMilliseconds: number;
}

export function runGrammarSearchBenchmark(iterations = 100): GrammarSearchBenchmarkResult {
  const indexStart = performance.now();
  const corpus = buildSearchCorpus(lessons);
  const indexMilliseconds = performance.now() - indexStart;

  representativeQueries.forEach((query) => searchLessons(query));
  let slowestQueryMilliseconds = 0;
  for (let index = 0; index < iterations; index += 1) {
    const query = representativeQueries[index % representativeQueries.length]!;
    const queryStart = performance.now();
    searchLessons(query);
    slowestQueryMilliseconds = Math.max(slowestQueryMilliseconds, performance.now() - queryStart);
  }

  return {
    documentCount: corpus.length,
    queryCount: iterations,
    indexMilliseconds,
    slowestQueryMilliseconds,
  };
}

const main = () => {
  const result = runGrammarSearchBenchmark(100);
  process.stdout.write(`Search documents: ${result.documentCount}\n`);
  process.stdout.write(`Index construction: ${result.indexMilliseconds.toFixed(3)} ms (limit 50 ms)\n`);
  process.stdout.write(`Slowest warm query: ${result.slowestQueryMilliseconds.toFixed(3)} ms (limit 20 ms)\n`);
  if (result.documentCount !== 274) throw new Error('Unexpected logical search document count.');
  if (result.indexMilliseconds >= 50) throw new Error('Grammar search index construction exceeded 50 ms.');
  if (result.slowestQueryMilliseconds >= 20) throw new Error('Grammar search query exceeded 20 ms.');
  process.stdout.write('Grammar search benchmark PASS\n');
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

