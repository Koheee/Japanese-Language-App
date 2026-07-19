import { execFileSync } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

import { lessons } from '../src/data/lessons';

export interface PublicTextFile {
  path: string;
  content: string;
}

const normalizePublicPath = (path: string): string => path.replaceAll('\\', '/').toLowerCase();

const isForbiddenPublicPath = (path: string): boolean => {
  const normalized = normalizePublicPath(path);
  const segments = normalized.split('/');
  const name = segments.at(-1) ?? '';
  return segments.includes('.local')
    || /\.(?:apkg|anki2|anki21b)$/u.test(name)
    || /^collection\.anki/iu.test(name)
    || /personal-vocabulary(?:-[^/]*)?\.json$/u.test(name)
    || name === 'media'
    || name === 'media.db2';
};

export const findForbiddenTrackedPaths = (paths: readonly string[]): string[] =>
  paths.filter(isForbiddenPublicPath);

const FORBIDDEN_PUBLIC_REFERENCE = /\.local\/vocabulary\/personal-vocabulary-v1\.json|collection\.anki[^"'`\s/]*|[^"'`\s/]*personal-vocabulary[^"'`\s/]*\.json|[^"'`\s/]*\.(?:apkg|anki2|anki21b)\b/gu;

export const countForbiddenPublicReferences = (contents: readonly string[]): number =>
  contents.reduce((count, content) => {
    const normalized = content.toLowerCase().replace(/\\+/gu, '/');
    return count + (normalized.match(FORBIDDEN_PUBLIC_REFERENCE)?.length ?? 0);
  }, 0);

export const isLegitimatePublicCorpusPath = (path: string): boolean => {
  const normalized = normalizePublicPath(path);
  if (normalized === 'app.tsx' || normalized === 'index.ts') return true;
  if (normalized.startsWith('public/')) return TEXT_EXTENSIONS.has(extname(normalized));
  return normalized.startsWith('src/')
    && !normalized.startsWith('src/test/')
    && !normalized.includes('.test.')
    && ['.json', '.ts', '.tsx'].includes(extname(normalized));
};

const asObject = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;

const javascriptStringLiteral = (
  value: string,
  quote: "'" | '"',
  escapeUnicode: boolean,
  uppercaseHex = false,
): string => {
  let encoded = quote;
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    const character = value[index]!;
    if (character === quote || character === '\\') {
      encoded += `\\${character}`;
    } else if (character === '\b') encoded += '\\b';
    else if (character === '\f') encoded += '\\f';
    else if (character === '\n') encoded += '\\n';
    else if (character === '\r') encoded += '\\r';
    else if (character === '\t') encoded += '\\t';
    else if (codeUnit < 0x20 || codeUnit === 0x2028 || codeUnit === 0x2029 || (escapeUnicode && codeUnit > 0x7e)) {
      const hex = codeUnit.toString(16).padStart(4, '0');
      encoded += `\\u${uppercaseHex ? hex.toUpperCase() : hex}`;
    } else {
      encoded += character;
    }
  }
  return `${encoded}${quote}`;
};

export const javascriptStringCanaries = (value: string): string[] => [...new Set([
  javascriptStringLiteral(value, '"', false),
  javascriptStringLiteral(value, "'", false),
  javascriptStringLiteral(value, '"', true),
  javascriptStringLiteral(value, "'", true),
  javascriptStringLiteral(value, '"', true, true),
  javascriptStringLiteral(value, "'", true, true),
])];

const isDistinctiveTextCanary = (
  key: 'japanese' | 'reading' | 'english' | 'category',
  value: string,
): boolean => Array.from(value.trim()).length >= (key === 'japanese' || key === 'reading' ? 4 : 12);

export const findPrivateCanaryLeaks = (
  privateFile: unknown,
  publicContent: string,
  distFiles: readonly PublicTextFile[],
): number => {
  const root = asObject(privateFile);
  const records = root?.records;
  if (!Array.isArray(records)) throw new Error('Private input has an invalid structure');

  const identityCanaries = new Set<string>();
  const textCanaries = new Map<string, string[]>();
  for (const recordValue of records) {
    const record = asObject(recordValue);
    const item = asObject(record?.item);
    if (!item) throw new Error('Private input has an invalid record structure');
    for (const key of ['id', 'sourceId'] as const) {
      const value = item[key];
      if (typeof value !== 'string' || !value) throw new Error('Private input has an invalid identity field');
      identityCanaries.add(value);
    }
    for (const key of ['japanese', 'reading', 'english', 'category'] as const) {
      const value = item[key];
      if (typeof value !== 'string' || !isDistinctiveTextCanary(key, value)) continue;
      if (!publicContent.includes(value)) textCanaries.set(value, javascriptStringCanaries(value));
    }
  }

  const publicBundle = distFiles.map(({ content }) => content).join('\n');
  const identityLeaks = [...identityCanaries]
    .filter((canary) => publicBundle.includes(canary))
    .length;
  const textLeaks = [...textCanaries.values()]
    .filter((encodings) => encodings.some((canary) => publicBundle.includes(canary)))
    .length;
  return identityLeaks + textLeaks;
};

const LOOPBACK_SERVICE_WORKER_GUARD = /if\s*\(\s*['"]serviceWorker['"]\s+in\s+navigator\s*&&\s*\(?\s*location\.protocol\s*===\s*['"]https:['"]\s*\|\|\s*location\.hostname\s*===\s*['"]localhost['"]\s*\|\|\s*location\.hostname\s*===\s*['"]127\.0\.0\.1['"]\s*\)?\s*\)\s*\{/u;

export const findServiceWorkerRegistrationIssues = (indexHtml: string): string[] =>
  LOOPBACK_SERVICE_WORKER_GUARD.test(indexHtml)
  && /navigator\.serviceWorker\.register\(\s*['"]\.\/sw\.js['"]\s*\)/u.test(indexHtml)
    ? []
    : ['service-worker-registration-policy'];

const assertSelfTest = (condition: unknown): void => {
  if (!condition) throw new Error('Public artifact safety self-test failed');
};

const runSelfTest = async (): Promise<void> => {
  const forbidden = findForbiddenTrackedPaths([
    'source.apkg',
    'collection.anki21b',
    '.local/vocabulary/personal-vocabulary-v1.json',
    'backup/personal-vocabulary-export.json',
    'src/App.tsx',
    'public/assets/icon.png',
  ]);
  assertSelfTest(forbidden.length === 4);
  assertSelfTest(countForbiddenPublicReferences([
    'const privatePath = ".local/vocabulary/personal-vocabulary-v1.json";',
    'const exportedPrivatePath = "backup/personal-vocabulary-export.json";',
    'const normalAsset = "assets/icon.png";',
  ]) === 2);
  assertSelfTest(isLegitimatePublicCorpusPath('src/screens/ProgressScreen.tsx'));
  assertSelfTest(isLegitimatePublicCorpusPath('src/data/lessons/lesson01.ts'));
  assertSelfTest(isLegitimatePublicCorpusPath('public/index.html'));
  assertSelfTest(!isLegitimatePublicCorpusPath('src/services/vocabularyBackup.test.ts'));
  assertSelfTest(!isLegitimatePublicCorpusPath('scripts/vocabulary/importVocabulary.ts'));

  const privateFile = {
    records: [{
      lessonId: 'lesson-01',
      item: {
        id: 'personal-deck:lesson-01:9001',
        sourceId: 'L01-9001',
        japanese: '\u9020\u8a9e\u56db\u5b57',
        reading: '\u304d\u305e\u3046\u3054',
        english: 'invented private gloss',
        category: 'invented category',
      },
    }],
  };
  const embeddedCanaries = JSON.stringify(privateFile);
  assertSelfTest(findPrivateCanaryLeaks(
    privateFile,
    JSON.stringify({ vocabulary: [] }),
    [{ path: 'dist/_expo/static/js/app.js', content: embeddedCanaries }],
  ) === 6);
  assertSelfTest(findPrivateCanaryLeaks(
    privateFile,
    JSON.stringify({ vocabulary: ['invented private gloss'] }),
    [{ path: 'dist/_expo/static/js/app.js', content: embeddedCanaries }],
  ) === 5);
  assertSelfTest(findPrivateCanaryLeaks(
    privateFile,
    JSON.stringify({ vocabulary: [] }),
    [{ path: 'dist/_expo/static/js/app.js', content: JSON.stringify(['invented private gloss']) }],
  ) === 1);
  assertSelfTest(findPrivateCanaryLeaks(
    {
      records: [{
        item: {
          id: 'personal-deck:lesson-01:9002',
          sourceId: 'L01-9002',
          japanese: '\u672a\u4f7f\u7528\u8a9e',
          reading: '\u307f\u3057\u3088\u3046\u3054',
          english: 'component',
          category: 'noun',
        },
      }],
    },
    JSON.stringify({ vocabulary: [] }),
    [{ path: 'dist/_expo/static/js/app.js', content: "const runtime='component';const type='noun';" }],
  ) === 0);
  assertSelfTest(findPrivateCanaryLeaks(
    privateFile,
    JSON.stringify({ vocabulary: [] }),
    [{ path: 'dist/_expo/static/js/app.js', content: JSON.stringify(['prefix invented private gloss suffix']) }],
  ) === 0);
  assertSelfTest(findPrivateCanaryLeaks(
    privateFile,
    'The invented private gloss is already legitimate public interface copy.',
    [{ path: 'dist/_expo/static/js/app.js', content: JSON.stringify(['invented private gloss']) }],
  ) === 0);
  assertSelfTest(findPrivateCanaryLeaks(
    privateFile,
    JSON.stringify({ vocabulary: [] }),
    [{
      path: 'dist/_expo/static/js/app.js',
      content: "const english='invented private gloss';const japanese='\\u9020\\u8a9e\\u56db\\u5b57';",
    }],
  ) === 2);
  assertSelfTest(findPrivateCanaryLeaks(
    privateFile,
    JSON.stringify({ vocabulary: [] }),
    [{ path: 'dist/_expo/static/js/app.js', content: "const japanese='\\u9020\\u8A9E\\u56DB\\u5B57';" }],
  ) === 1);
  assertSelfTest(findPrivateCanaryLeaks(
    privateFile,
    JSON.stringify({ vocabulary: [] }),
    [{
      path: 'dist/_expo/static/js/app.js',
      content: "const english='prefix invented private gloss suffix';const japanese='\\u524d\\u9020\\u8a9e\\u56db\\u5b57\\u5f8c';",
    }],
  ) === 0);

  const safeGuard = "location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1'";
  const safeHtml = `<script>if ('serviceWorker' in navigator && (${safeGuard})) { navigator.serviceWorker.register('./sw.js'); }</script>`;
  const broadHtml = "<script>if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.protocol === 'http:')) { navigator.serviceWorker.register('./sw.js'); }</script>";
  assertSelfTest(findServiceWorkerRegistrationIssues(safeHtml).length === 0);
  assertSelfTest(findServiceWorkerRegistrationIssues(broadHtml).length > 0);

  const sourceIndex = await readFile('public/index.html', 'utf8');
  assertSelfTest(findServiceWorkerRegistrationIssues(sourceIndex).length === 0);
  const forwardedArguments = parseArguments(['--', '--tracked', '--dist', 'dist']);
  assertSelfTest(forwardedArguments.tracked && forwardedArguments.dist === 'dist');
  process.stdout.write('Public artifact safety self-test PASS\n');
};

interface AuditArguments {
  selfTest: boolean;
  tracked: boolean;
  dist?: string;
  privatePath?: string;
}

const parseArguments = (args: readonly string[]): AuditArguments => {
  const parsed: AuditArguments = { selfTest: false, tracked: false };
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === '--' && index === 0) continue;
    if (flag === '--self-test' && args.length === 1) {
      parsed.selfTest = true;
      continue;
    }
    if (flag === '--tracked' && !parsed.tracked) {
      parsed.tracked = true;
      continue;
    }
    if ((flag === '--dist' || flag === '--private') && args[index + 1]) {
      const value = args[index + 1]!;
      index += 1;
      if (flag === '--dist' && parsed.dist === undefined) parsed.dist = value;
      else if (flag === '--private' && parsed.privatePath === undefined) parsed.privatePath = value;
      else throw new Error('Duplicate public artifact safety argument');
      continue;
    }
    throw new Error('Invalid public artifact safety arguments');
  }
  if (parsed.selfTest && (parsed.tracked || parsed.dist || parsed.privatePath)) {
    throw new Error('Self-test cannot be combined with audit modes');
  }
  if (!parsed.selfTest && !parsed.tracked && !parsed.dist) {
    throw new Error('At least one public artifact safety mode is required');
  }
  if (parsed.privatePath && !parsed.dist) {
    throw new Error('Private canary scanning requires a public distribution');
  }
  return parsed;
};

const TEXT_EXTENSIONS = new Set([
  '.cjs', '.css', '.html', '.js', '.json', '.map', '.mjs', '.svg', '.txt', '.webmanifest', '.xml',
]);

const collectFiles = async (root: string, directory = root): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(root, path);
    if (entry.isFile()) return [relative(root, path)];
    const resolved = await stat(path);
    if (resolved.isDirectory()) return collectFiles(root, path);
    return resolved.isFile() ? [relative(root, path)] : [];
  }));
  return nested.flat();
};

const collectPublicTextFiles = async (root: string, files: readonly string[]): Promise<PublicTextFile[]> =>
  Promise.all(files
    .filter((path) => TEXT_EXTENSIONS.has(extname(path).toLowerCase()))
    .map(async (path) => ({ path, content: await readFile(join(root, path), 'utf8') })));

const readTrackedPaths = (): string[] => {
  const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' });
  return tracked.split('\0').filter(Boolean);
};

const readLegitimatePublicCorpus = async (): Promise<string> => {
  const paths = readTrackedPaths().filter(isLegitimatePublicCorpusPath);
  const sourceContents = await Promise.all(paths.map((path) => readFile(path, 'utf8')));
  return [JSON.stringify(lessons), ...sourceContents].join('\n');
};

const getRecordCount = (privateFile: unknown): number | undefined => {
  const records = asObject(privateFile)?.records;
  return Array.isArray(records) ? records.length : undefined;
};

const runAudit = async (args: AuditArguments): Promise<boolean> => {
  let issueCount = 0;
  if (args.tracked) {
    const forbiddenTracked = findForbiddenTrackedPaths(readTrackedPaths()).length;
    if (forbiddenTracked > 0) process.stdout.write(`Forbidden tracked path count: ${forbiddenTracked}\n`);
    issueCount += forbiddenTracked;
  }

  let distTextFiles: PublicTextFile[] = [];
  if (args.dist) {
    const distFiles = await collectFiles(args.dist);
    const forbiddenDistPaths = findForbiddenTrackedPaths(distFiles).length;
    distTextFiles = await collectPublicTextFiles(args.dist, distFiles);
    const forbiddenReferences = countForbiddenPublicReferences(distTextFiles.map(({ content }) => content));
    const indexHtml = distTextFiles.find(({ path }) => normalizePublicPath(path) === 'index.html')?.content;
    const serviceWorkerIssues = indexHtml ? findServiceWorkerRegistrationIssues(indexHtml).length : 1;
    const requiredPaths = new Set(distFiles.map(normalizePublicPath));
    const structureIssues = ['index.html', 'sw.js', 'manifest.json']
      .filter((path) => !requiredPaths.has(path))
      .length;
    if (forbiddenDistPaths > 0) process.stdout.write(`Forbidden exported path count: ${forbiddenDistPaths}\n`);
    if (forbiddenReferences > 0) process.stdout.write(`Forbidden exported reference count: ${forbiddenReferences}\n`);
    if (serviceWorkerIssues > 0) process.stdout.write(`Service worker registration issue count: ${serviceWorkerIssues}\n`);
    if (structureIssues > 0) process.stdout.write(`Export structure issue count: ${structureIssues}\n`);
    issueCount += forbiddenDistPaths + forbiddenReferences + serviceWorkerIssues + structureIssues;
  }

  if (args.privatePath) {
    const privateFile = JSON.parse(await readFile(args.privatePath, 'utf8')) as unknown;
    if (getRecordCount(privateFile) !== 1_289) {
      process.stdout.write('Private record count validation FAIL\n');
      issueCount += 1;
    } else {
      const publicContent = await readLegitimatePublicCorpus();
      const canaryLeaks = findPrivateCanaryLeaks(privateFile, publicContent, distTextFiles);
      process.stdout.write(`Private canary leak count: ${canaryLeaks}\n`);
      issueCount += canaryLeaks;
    }
  }
  return issueCount === 0;
};

const main = async (): Promise<void> => {
  try {
    const args = parseArguments(process.argv.slice(2));
    if (args.selfTest) {
      await runSelfTest();
      return;
    }
    if (!await runAudit(args)) throw new Error('Public artifact safety issues found');
    process.stdout.write('Public artifact safety PASS\n');
  } catch {
    process.stderr.write('Public artifact safety FAIL\n');
    process.exitCode = 1;
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
