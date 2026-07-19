import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import { AUTHORED_BASELINE_VERSION } from '../../src/data/authoredBaseline';
import { lessons } from '../../src/data/lessons';
import type { VocabularyBackupFileV1 } from '../../src/models/vocabularyBackup';
import { containsLatinLetters, isKanaReading } from '../../src/services/vocabularyText';
import { readAnkiPackage } from './ankiPackage';
import { buildPersonalImport } from './buildPersonalImport';
import { loadReadingOverrides } from './importVocabulary';

const EXPECTED_ACCEPTED = {
  'lesson-01': 45, 'lesson-02': 42, 'lesson-03': 40, 'lesson-04': 55, 'lesson-05': 84,
  'lesson-06': 89, 'lesson-07': 47, 'lesson-08': 89, 'lesson-09': 87, 'lesson-10': 68,
  'lesson-11': 54, 'lesson-12': 63, 'lesson-13': 58, 'lesson-14': 70, 'lesson-15': 50,
  'lesson-16': 85, 'lesson-17': 34, 'lesson-18': 30, 'lesson-19': 29, 'lesson-20': 22,
  'lesson-21': 50, 'lesson-22': 37, 'lesson-23': 23, 'lesson-24': 20, 'lesson-25': 18,
} as const;
const EXPECTED_SOURCE = {
  'lesson-01': 47, 'lesson-02': 48, 'lesson-03': 50, 'lesson-04': 56, 'lesson-05': 90,
  'lesson-06': 98, 'lesson-07': 54, 'lesson-08': 93, 'lesson-09': 95, 'lesson-10': 69,
  'lesson-11': 58, 'lesson-12': 71, 'lesson-13': 63, 'lesson-14': 72, 'lesson-15': 52,
  'lesson-16': 88, 'lesson-17': 35, 'lesson-18': 30, 'lesson-19': 30, 'lesson-20': 22,
  'lesson-21': 53, 'lesson-22': 37, 'lesson-23': 23, 'lesson-24': 20, 'lesson-25': 18,
} as const;

const usage = 'Usage: pnpm vocabulary:verify -- --source <APKG path> --output <JSON path> [--reading-overrides <JSON path>]';

const parseArguments = (args: string[]) => {
  if (args.length !== 4 && args.length !== 6) throw new Error(usage);
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!flag || !value || !['--source', '--output', '--reading-overrides'].includes(flag) || values.has(flag)) throw new Error(usage);
    values.set(flag, value);
  }
  const source = values.get('--source');
  const output = values.get('--output');
  if (!source || !output) throw new Error(usage);
  return { source, output, readingOverridesPath: values.get('--reading-overrides') };
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
};

export const verifyPersonalVocabulary = async ({ source, output, readingOverridesPath }: { source: string; output: string; readingOverridesPath?: string }) => {
  const outputFile = JSON.parse(await readFile(output, 'utf8')) as VocabularyBackupFileV1;
  const collection = await readAnkiPackage(source);
  const readingOverrides = await loadReadingOverrides(readingOverridesPath);
  const rebuilt = buildPersonalImport({
    collection,
    authoredLessons: lessons,
    authoredBaselineVersion: AUTHORED_BASELINE_VERSION,
    generatedAt: outputFile.exportedAt,
    readingOverrides,
  });
  assert(isDeepStrictEqual(rebuilt, outputFile), 'Generated backup does not match a deterministic rebuild');
  const summary = rebuilt.generation;
  assert(summary, 'Generated backup lacks its generation summary');
  assert(summary.sourceNoteCount === 1372, 'Source note count did not match the expected aggregate');
  assert(summary.acceptedCount === 1289, 'Accepted record count did not match the expected aggregate');
  assert(summary.skippedAuthoredCount === 82, 'Authored skip count did not match the expected aggregate');
  assert(summary.skippedEarlierPersonalCount === 1 && summary.acceptedByLesson['lesson-10'] === 68, 'Earlier personal duplicate count did not match the expected aggregate');
  assert(isDeepStrictEqual(summary.acceptedByLesson, EXPECTED_ACCEPTED), 'Accepted lesson counts did not match');
  assert(isDeepStrictEqual(summary.sourceByLesson, EXPECTED_SOURCE), 'Source lesson counts did not match');
  assert(new Set(rebuilt.records.map(({ item }) => item.id)).size === 1289, 'Record IDs were not unique');
  assert(rebuilt.records.every(({ item }) => isKanaReading(item.reading) && !containsLatinLetters(item.reading)), 'One or more readings were invalid');
  const serialized = JSON.stringify(rebuilt);
  assert(!/\[sound:|<img|<[^>]+>|\.(?:png|jpe?g|gif|webp|mp3|wav|ogg)\b/iu.test(serialized), 'Serialized backup retained unsupported source markup or media');
  assert(/^[a-f0-9]{64}$/.test(summary.checksumSha256), 'Checksum has an invalid format');
  return summary;
};

const main = async () => {
  const summary = await verifyPersonalVocabulary(parseArguments(process.argv.slice(2)));
  for (const [lessonId, count] of Object.entries(summary.acceptedByLesson)) {
    process.stdout.write(`${lessonId}=${count}\n`);
  }
  process.stdout.write(`PASS ${summary.acceptedCount} records, checksum ${summary.checksumSha256}\n`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
