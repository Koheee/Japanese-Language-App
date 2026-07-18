import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
import { toHiragana } from 'wanakana';

import { containsHan, isKanaReading } from '../src/services/vocabularyText';

const files = [
  'src/data/lessons/lesson01.ts',
  'src/data/lessons/lessons02to09.ts',
  'src/data/lessons/lessons10to17.ts',
  'src/data/lessons/lessons18to25.ts',
] as const;
const write = process.argv.includes('--write');
const quote = (value: string) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const migrate = (japanese: string, oldReading: string) => {
  const next = (containsHan(japanese) ? toHiragana(oldReading) : japanese)
    .normalize('NFKC')
    .replace(/~/g, '〜')
    .replace(/\//g, '／');
  if (!isKanaReading(next)) throw new Error(`Unsafe migrated reading: ${japanese} -> ${next}`);
  return next;
};

type Replacement = {
  start: number;
  end: number;
  next: string;
};

const nameOf = (name: ts.PropertyName): string | undefined =>
  ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name) ? name.text : undefined;

const property = (node: ts.ObjectLiteralExpression, name: string): ts.PropertyAssignment | undefined =>
  node.properties.find(
    (candidate): candidate is ts.PropertyAssignment =>
      ts.isPropertyAssignment(candidate) && nameOf(candidate.name) === name,
  );

const stringLiteral = (node: ts.Expression | undefined, label: string): ts.StringLiteral => {
  if (!node || !ts.isStringLiteral(node)) {
    throw new Error(`Recognized vocabulary ${label} must be a string literal.`);
  }
  return node;
};

const migrateLiteral = (
  sourceFile: ts.SourceFile,
  japaneseNode: ts.Expression | undefined,
  readingNode: ts.Expression | undefined,
  replacements: Replacement[],
) => {
  const japaneseLiteral = stringLiteral(japaneseNode, 'Japanese field');
  const readingLiteral = stringLiteral(readingNode, 'reading field');
  const japanese = japaneseLiteral.text;
  const oldReading = readingLiteral.text;
  const next = migrate(japanese, oldReading);
  if (oldReading !== next) {
    replacements.push({
      start: readingLiteral.getStart(sourceFile),
      end: readingLiteral.getEnd(),
      next: quote(next),
    });
  }
};

const migrateFile = async (file: (typeof files)[number]) => {
  const source = await readFile(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const replacements: Replacement[] = [];
  let recognized = 0;

  const visit = (node: ts.Node): void => {
    if (ts.isObjectLiteralExpression(node)) {
      const id = property(node, 'id');
      if (id && ts.isStringLiteral(id.initializer) && /^l\d+-v\d+$/.test(id.initializer.text)) {
        recognized += 1;
        migrateLiteral(
          sourceFile,
          property(node, 'japanese')?.initializer,
          property(node, 'reading')?.initializer,
          replacements,
        );
      }
    }

    if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && (node.expression.text === 'vocabulary' || node.expression.text === 'makeVocabulary')
    ) {
      const seeds = node.arguments[1];
      if (!seeds || !ts.isArrayLiteralExpression(seeds)) {
        throw new Error(`${node.expression.text} vocabulary seeds must be an array literal.`);
      }
      for (const seed of seeds.elements) {
        if (!ts.isArrayLiteralExpression(seed)) {
          throw new Error(`${node.expression.text} vocabulary seed must be a tuple literal.`);
        }
        recognized += 1;
        migrateLiteral(sourceFile, seed.elements[0], seed.elements[1], replacements);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  if (write && replacements.length > 0) {
    const updated = [...replacements]
      .sort((left, right) => right.start - left.start)
      .reduce((result, replacement) =>
        `${result.slice(0, replacement.start)}${replacement.next}${result.slice(replacement.end)}`, source);
    await writeFile(file, updated, 'utf8');
  }
  return { recognized, changes: replacements.length };
};

const main = async () => {
  const results = await Promise.all(files.map(migrateFile));
  const recognized = results.reduce((total, result) => total + result.recognized, 0);
  const changes = results.reduce((total, result) => total + result.changes, 0);

  if (recognized !== 428) {
    throw new Error(`Expected 428 vocabulary records, recognized ${recognized}.`);
  }
  if (!write && changes > 0) {
    throw new Error(`Vocabulary readings have drifted in ${changes} records. Run with --write.`);
  }

  console.log(`${write ? 'Migrated' : 'Verified'} ${recognized} vocabulary readings.`);
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
