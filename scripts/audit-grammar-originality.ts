import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { lessons } from '../src/data/lessons';
import {
  ORIGINALITY_MIN_TOKENS,
  OriginalityTextUnit,
  collectAppOriginalityFields,
  findCrossCorpusOverlaps,
} from './grammar-originality-core';

export const SAERIS_PINNED_REVISION = '7aa1ac10';
export const SAERIS_GRAMMAR_SCOPE = 'public/learn/grammar';
export const ORIGINALITY_NORMALIZATION =
  'Unicode NFKC; lowercase; curly apostrophes normalized; punctuation removed; Latin words and individual Han/kana tokenized';

const git = (sourceDirectory: string, args: readonly string[]): string =>
  execFileSync('git', ['-C', sourceDirectory, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

const collectMarkdownFiles = async (
  root: string,
  directory = root,
): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectMarkdownFiles(root, path);
    return entry.isFile() && entry.name.toLowerCase().endsWith('.md')
      ? [relative(root, path).replaceAll('\\', '/')]
      : [];
  }));
  return nested.flat();
};

export const parseGrammarOriginalityArguments = (args: readonly string[]): string => {
  const forwarded = args[0] === '--' ? args.slice(1) : args;
  if (forwarded.length !== 2 || forwarded[0] !== '--source' || !forwarded[1]) {
    throw new Error('Usage: pnpm audit:grammar-originality -- --source <checked-out-saeris-directory>');
  }
  return resolve(forwarded[1]);
};

export const auditGrammarOriginality = async (sourceDirectory: string) => {
  const head = git(sourceDirectory, ['rev-parse', '--verify', 'HEAD^{commit}']);
  const pinned = git(sourceDirectory, [
    'rev-parse',
    '--verify',
    `${SAERIS_PINNED_REVISION}^{commit}`,
  ]);
  if (head !== pinned) {
    throw new Error(`Saeris source must be checked out at ${SAERIS_PINNED_REVISION}.`);
  }
  const dirtyScope = git(sourceDirectory, [
    'status',
    '--porcelain=v1',
    '--untracked-files=all',
    '--',
    SAERIS_GRAMMAR_SCOPE,
  ]);
  if (dirtyScope) throw new Error(`Saeris source scope ${SAERIS_GRAMMAR_SCOPE} must be clean.`);

  const scopeRoot = join(sourceDirectory, ...SAERIS_GRAMMAR_SCOPE.split('/'));
  const sourcePaths = (await collectMarkdownFiles(scopeRoot))
    .sort((left, right) => left.localeCompare(right, 'en'));
  if (sourcePaths.length === 0) {
    throw new Error(`No Markdown files found under ${SAERIS_GRAMMAR_SCOPE}.`);
  }
  const sourceFiles: OriginalityTextUnit[] = await Promise.all(sourcePaths.map(async (path) => ({
    id: `${SAERIS_GRAMMAR_SCOPE}/${path}`,
    text: await readFile(join(scopeRoot, path), 'utf8'),
  })));
  const appFields = collectAppOriginalityFields(lessons);
  const overlaps = findCrossCorpusOverlaps(appFields, sourceFiles);
  return {
    revision: head,
    appFieldCount: appFields.length,
    sourceFileCount: sourceFiles.length,
    overlapCount: overlaps.length,
  };
};

const main = async () => {
  const sourceDirectory = parseGrammarOriginalityArguments(process.argv.slice(2));
  const result = await auditGrammarOriginality(sourceDirectory);
  process.stdout.write(`Pinned Saeris revision: ${SAERIS_PINNED_REVISION} (${result.revision})\n`);
  process.stdout.write(`Source scope: ${SAERIS_GRAMMAR_SCOPE}/**/*.md\n`);
  process.stdout.write(`Normalization/tokenization: ${ORIGINALITY_NORMALIZATION}\n`);
  process.stdout.write(`Distinctive overlap threshold: ${ORIGINALITY_MIN_TOKENS} consecutive tokens\n`);
  process.stdout.write(`App authored field count: ${result.appFieldCount}\n`);
  process.stdout.write(`Source file count: ${result.sourceFileCount}\n`);
  process.stdout.write(`Cross-corpus overlap count: ${result.overlapCount}\n`);
  if (result.overlapCount > 0) throw new Error('Grammar originality audit found distinctive wording overlap.');
  process.stdout.write('Grammar originality audit PASS\n');
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((cause: unknown) => {
    process.stderr.write(`${cause instanceof Error ? cause.message : String(cause)}\n`);
    process.exitCode = 1;
  });
}
