import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

export interface PublicRuntimeTextFile {
  path: string;
  content: string;
}

export interface PublicRuntimeCorpus {
  packageCount: number;
  files: PublicRuntimeTextFile[];
}

interface PackageManifest {
  name?: string;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

interface PendingPackage {
  name: string;
  parentRoot: string;
  optional: boolean;
}

const SOURCE_EXTENSIONS = new Set(['.cjs', '.js', '.json', '.jsx', '.mjs', '.ts', '.tsx']);
const EXCLUDED_DIRECTORIES = new Set([
  '__tests__', 'docs', 'examples', 'node_modules', 'scripts', 'test', 'tests',
]);

const compareText = (left: string, right: string): number => left < right ? -1 : left > right ? 1 : 0;
const packageSegments = (name: string): string[] => name.split('/');

const resolvePackageRoot = async (
  projectRoot: string,
  pending: PendingPackage,
): Promise<string | undefined> => {
  const candidates = [
    join(pending.parentRoot, 'node_modules', ...packageSegments(pending.name)),
    join(projectRoot, 'node_modules', ...packageSegments(pending.name)),
    join(projectRoot, 'node_modules', '.pnpm', 'node_modules', ...packageSegments(pending.name)),
  ];
  for (const candidate of candidates) {
    try {
      if ((await stat(candidate)).isDirectory()) return realpath(candidate);
    } catch {
      // Try the next deterministic installation location.
    }
  }
  if (pending.optional) return undefined;
  throw new Error(`Required public runtime dependency is not installed: ${pending.name}`);
};

const collectPackageSourcePaths = async (
  packageRoot: string,
  directory = packageRoot,
): Promise<string[]> => {
  const entries = (await readdir(directory, { withFileTypes: true }))
    .sort((left, right) => compareText(left.name, right.name));
  const nested = await Promise.all(entries.map(async (entry) => {
    if (EXCLUDED_DIRECTORIES.has(entry.name.toLowerCase())) return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectPackageSourcePaths(packageRoot, path);
    if (!entry.isFile()) {
      const resolved = await stat(path);
      return resolved.isDirectory() ? collectPackageSourcePaths(packageRoot, path) : [];
    }
    const normalized = relative(packageRoot, path).replaceAll('\\', '/');
    if (normalized.endsWith('.d.ts') || !SOURCE_EXTENSIONS.has(extname(normalized).toLowerCase())) {
      return [];
    }
    return [normalized];
  }));
  return nested.flat();
};

const dependencyQueue = (
  manifest: PackageManifest,
  parentRoot: string,
): PendingPackage[] => {
  const required = Object.keys(manifest.dependencies ?? {}).map((name) => ({
    name,
    parentRoot,
    optional: false,
  }));
  const optional = [
    ...Object.keys(manifest.optionalDependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ].map((name) => ({ name, parentRoot, optional: true }));
  return [...required, ...optional].sort((left, right) => compareText(left.name, right.name));
};

export const collectInstalledPublicRuntimeCorpus = async (
  projectDirectory = '.',
): Promise<PublicRuntimeCorpus> => {
  const projectRoot = resolve(projectDirectory);
  const rootManifest = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8')) as PackageManifest;
  const queue = dependencyQueue({ dependencies: rootManifest.dependencies }, projectRoot);
  const visitedRoots = new Set<string>();
  const files: PublicRuntimeTextFile[] = [];

  while (queue.length > 0) {
    const pending = queue.shift()!;
    const packageRoot = await resolvePackageRoot(projectRoot, pending);
    if (!packageRoot || visitedRoots.has(packageRoot)) continue;
    visitedRoots.add(packageRoot);

    const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8')) as PackageManifest;
    const packageName = manifest.name ?? pending.name;
    const sourcePaths = await collectPackageSourcePaths(packageRoot);
    const packageFiles = await Promise.all(sourcePaths.map(async (path) => ({
      path: `${packageName}/${path}`,
      content: await readFile(join(packageRoot, path), 'utf8'),
    })));
    files.push(...packageFiles);
    queue.push(...dependencyQueue(manifest, packageRoot));
    queue.sort((left, right) =>
      compareText(left.name, right.name) || compareText(left.parentRoot, right.parentRoot));
  }

  files.sort((left, right) => compareText(left.path, right.path));
  return { packageCount: visitedRoots.size, files };
};
