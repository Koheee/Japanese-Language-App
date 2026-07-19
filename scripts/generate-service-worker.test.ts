import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import { generateServiceWorker } from './generate-service-worker';

const writeFixture = async (root: string, path: string, content: string) => {
  const target = join(root, path);
  await mkdir(join(target, '..'), { recursive: true });
  await writeFile(target, content, 'utf8');
};

describe('production service-worker generation', () => {
  it('builds a deterministic versioned precache for the public shell and generated runtime only', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nihongo-path-export-'));
    try {
      await Promise.all([
        writeFixture(root, 'index.html', '<!doctype html><script src="/Japanese-Language-App/_expo/static/js/web/app-a1b2c3.js"></script>'),
        writeFixture(root, 'manifest.json', '{"name":"Nihongo Path"}'),
        writeFixture(root, 'icon-192.png', 'icon-192'),
        writeFixture(root, 'icon-512.png', 'icon-512'),
        writeFixture(root, 'apple-touch-icon.png', 'apple-touch'),
        writeFixture(root, '_expo/static/js/web/app-a1b2c3.js', 'globalThis.__APP__ = true;'),
        writeFixture(root, 'assets/font-deadbeef.woff2', 'font bytes'),
        writeFixture(root, 'assets/image-1234abcd.png', 'image bytes'),
        writeFixture(root, '_expo/static/js/web/app-a1b2c3.js.map', '{"sources":["private/local/source.ts"]}'),
        writeFixture(root, '.local/vocabulary/personal-vocabulary-v1.json', '{"private":true}'),
        writeFixture(root, 'private/operator-notes.txt', 'must not ship'),
      ]);

      const first = await generateServiceWorker(root);
      const firstWorker = await readFile(join(root, 'sw.js'), 'utf8');
      const second = await generateServiceWorker(root);
      const secondWorker = await readFile(join(root, 'sw.js'), 'utf8');

      expect(first.cacheName).toMatch(/^nihongo-path-precache-[0-9a-f]{16}$/u);
      expect(second.cacheName).toBe(first.cacheName);
      expect(secondWorker).toBe(firstWorker);
      expect(first.precachePaths).toEqual([
        './',
        './_expo/static/js/web/app-a1b2c3.js',
        './apple-touch-icon.png',
        './assets/font-deadbeef.woff2',
        './assets/image-1234abcd.png',
        './icon-192.png',
        './icon-512.png',
        './manifest.json',
      ]);
      expect(firstWorker).toContain('local("./_expo/static/js/web/app-a1b2c3.js")');
      expect(firstWorker).toContain('local("./assets/font-deadbeef.woff2")');
      expect(firstWorker).not.toContain('.js.map');
      expect(firstWorker).not.toContain('.local');
      expect(firstWorker).not.toContain('private/operator-notes');
      expect(firstWorker).not.toContain('personal-vocabulary');

      await writeFixture(root, '_expo/static/js/web/app-a1b2c3.js', 'globalThis.__APP__ = false;');
      const changed = await generateServiceWorker(root);
      expect(changed.cacheName).not.toBe(first.cacheName);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
