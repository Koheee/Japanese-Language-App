import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

export interface GeneratedServiceWorker {
  cacheName: string;
  precachePaths: string[];
}

const CACHE_PREFIX = 'nihongo-path-precache-';

const normalizePath = (path: string): string => path.replaceAll('\\', '/');

const isPrivateOrLocalArtifact = (path: string): boolean => {
  const normalized = normalizePath(path).toLowerCase();
  const segments = normalized.split('/');
  const name = segments.at(-1) ?? '';
  return segments.includes('.local')
    || segments.includes('private')
    || segments.includes('.private')
    || /\.(?:apkg|anki2|anki21b)$/u.test(name)
    || /^collection\.anki/iu.test(name)
    || /personal-vocabulary(?:-[^/]*)?\.json$/u.test(name)
    || name === 'media'
    || name === 'media.db2';
};

export const isServiceWorkerPrecachePath = (path: string): boolean => {
  const normalized = normalizePath(path);
  return normalized !== 'sw.js'
    && extname(normalized).toLowerCase() !== '.map'
    && !isPrivateOrLocalArtifact(normalized);
};

const collectFiles = async (root: string, directory = root): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(root, path);
    return entry.isFile() ? [normalizePath(relative(root, path))] : [];
  }));
  return nested.flat();
};

const renderServiceWorker = (cacheName: string, precachePaths: readonly string[]): string => {
  const entries = precachePaths.map((path) => `  local(${JSON.stringify(path)})`).join(',\n');
  return `const CACHE_PREFIX = ${JSON.stringify(CACHE_PREFIX)};
const CACHE_NAME = ${JSON.stringify(cacheName)};
const scope = new URL(self.registration.scope);
const local = (path) => new URL(path, scope).toString();
const PRECACHE_FILES = [
${entries}
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== scope.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(local('./'), copy));
          return response;
        })
        .catch(() => caches.match(local('./'))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    })),
  );
});
`;
};

export const generateServiceWorker = async (exportRoot: string): Promise<GeneratedServiceWorker> => {
  const files = (await collectFiles(exportRoot))
    .filter(isServiceWorkerPrecachePath)
    .sort((left, right) => left.localeCompare(right, 'en'));
  if (!files.includes('index.html')) {
    throw new Error('Production export must contain index.html before generating its service worker.');
  }

  const hash = createHash('sha256');
  for (const path of files) {
    hash.update(path, 'utf8');
    hash.update('\0');
    hash.update(await readFile(join(exportRoot, path)));
    hash.update('\0');
  }
  const cacheName = `${CACHE_PREFIX}${hash.digest('hex').slice(0, 16)}`;
  const precachePaths = [
    './',
    ...files.filter((path) => path !== 'index.html').map((path) => `./${path}`),
  ];
  await writeFile(join(exportRoot, 'sw.js'), renderServiceWorker(cacheName, precachePaths), 'utf8');
  return { cacheName, precachePaths };
};

const main = async () => {
  const exportRoot = process.argv[2] ?? 'dist';
  const generated = await generateServiceWorker(exportRoot);
  process.stdout.write(
    `Generated ${generated.cacheName} with ${generated.precachePaths.length} precache entries.\n`,
  );
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((cause: unknown) => {
    process.stderr.write(`${cause instanceof Error ? cause.message : String(cause)}\n`);
    process.exitCode = 1;
  });
}
