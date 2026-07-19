import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

import { AUTHORED_BASELINE_VERSION } from '../../src/data/authoredBaseline';
import { lessons } from '../../src/data/lessons';
import { buildPersonalImport, type ReadingOverrides } from './buildPersonalImport';
import { readAnkiPackage } from './ankiPackage';

interface GenerateArguments {
  source: string;
  output: string;
  generatedAt: string;
  readingOverridesPath?: string;
}

const usage = 'Usage: pnpm vocabulary:generate -- --source <APKG path> [--output <JSON path>] [--generated-at <ISO timestamp>] [--reading-overrides <JSON path>]';

export const parseReadingOverridesJson = (raw: string): ReadingOverrides => {
  const rawKeys = [...raw.matchAll(/"((?:\\.|[^"\\])*)"\s*:/gu)].map((match) => JSON.parse(`"${match[1]}"`) as string);
  const seen = new Set<string>();
  for (const key of rawKeys) {
    if (seen.has(key)) throw new Error(`Reading overrides contain duplicate source ID ${key}`);
    seen.add(key);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Reading overrides must be valid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Reading overrides must be a JSON object');
  }
  const entries = Object.entries(parsed);
  if (!entries.every(([, reading]) => typeof reading === 'string')) {
    throw new Error('Reading override values must be strings');
  }
  return new Map(entries as Array<[string, string]>);
};

export const loadReadingOverrides = async (path?: string): Promise<ReadingOverrides> =>
  path ? parseReadingOverridesJson(await readFile(path, 'utf8')) : new Map();

const parseArguments = (args: string[]): GenerateArguments => {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!flag || !value || !['--source', '--output', '--generated-at', '--reading-overrides'].includes(flag) || values.has(flag)) {
      throw new Error(usage);
    }
    values.set(flag, value);
  }
  const source = values.get('--source');
  if (!source) throw new Error(usage);
  return {
    source,
    output: values.get('--output') ?? '.local/vocabulary/personal-vocabulary-v1.json',
    generatedAt: values.get('--generated-at') ?? new Date().toISOString(),
    readingOverridesPath: values.get('--reading-overrides'),
  };
};

export const generatePersonalVocabulary = async (args: GenerateArguments) => {
  const collection = await readAnkiPackage(args.source);
  const readingOverrides = await loadReadingOverrides(args.readingOverridesPath);
  const file = buildPersonalImport({
    collection,
    authoredLessons: lessons,
    authoredBaselineVersion: AUTHORED_BASELINE_VERSION,
    generatedAt: args.generatedAt,
    readingOverrides,
  });
  await mkdir(dirname(args.output), { recursive: true });
  await writeFile(args.output, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
  return file;
};

const main = async () => {
  const file = await generatePersonalVocabulary(parseArguments(process.argv.slice(2)));
  const summary = file.generation!;
  process.stdout.write(`generated accepted=${summary.acceptedCount} authored-skips=${summary.skippedAuthoredCount} earlier-personal-skips=${summary.skippedEarlierPersonalCount}\n`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
