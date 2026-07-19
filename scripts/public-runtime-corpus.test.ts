import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { collectInstalledPublicRuntimeCorpus } from './public-runtime-corpus';

const writeFixture = async (root: string, path: string, content: string) => {
  const target = join(root, path);
  await mkdir(join(target, '..'), { recursive: true });
  await writeFile(target, content, 'utf8');
};

describe('installed public runtime corpus', () => {
  it('collects deterministic production dependency sources without dev-only packages', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nihongo-runtime-corpus-'));
    try {
      await Promise.all([
        writeFixture(root, 'package.json', JSON.stringify({ dependencies: { 'runtime-a': '1.0.0' } })),
        writeFixture(root, 'node_modules/runtime-a/package.json', JSON.stringify({
          name: 'runtime-a',
          dependencies: { 'runtime-b': '1.0.0' },
          devDependencies: { 'dev-only': '1.0.0' },
        })),
        writeFixture(root, 'node_modules/runtime-a/src/index.ts', "export const state='component';"),
        writeFixture(root, 'node_modules/runtime-a/node_modules/runtime-b/package.json', JSON.stringify({ name: 'runtime-b' })),
        writeFixture(root, 'node_modules/runtime-a/node_modules/runtime-b/index.js', "module.exports='runtime';"),
        writeFixture(root, 'node_modules/runtime-a/node_modules/dev-only/package.json', JSON.stringify({ name: 'dev-only' })),
        writeFixture(root, 'node_modules/runtime-a/node_modules/dev-only/index.js', "module.exports='private-only';"),
        writeFixture(root, 'node_modules/runtime-a/tests/fixture.js', "export const testOnly='private-only';"),
      ]);

      const corpus = await collectInstalledPublicRuntimeCorpus(root);

      expect(corpus.packageCount).toBe(2);
      expect(corpus.files.map(({ path }) => path)).toEqual([
        'runtime-a/package.json',
        'runtime-a/src/index.ts',
        'runtime-b/index.js',
        'runtime-b/package.json',
      ]);
      expect(corpus.files.some(({ content }) => content.includes('private-only'))).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
