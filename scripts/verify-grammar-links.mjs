import { readFile } from 'node:fs/promises';

const grammarReferences = JSON.parse(
  await readFile(new URL('../src/data/grammarReferences.json', import.meta.url), 'utf8'),
);
const urls = [...new Set(Object.values(grammarReferences).flat().map(({ url }) => url))].sort();

if (urls.length < 25) {
  throw new Error(`Expected at least 25 unique approved learner URLs, received ${urls.length}.`);
}

for (const url of urls) {
  const parsed = new URL(url);
  const isTaeKim = parsed.protocol === 'https:'
    && parsed.hostname === 'guidetojapanese.org' && /^\/learn\/grammar\/[a-z_]+$/.test(parsed.pathname);
  const isTofugu = parsed.protocol === 'https:'
    && parsed.hostname === 'www.tofugu.com' && /^\/japanese-grammar\/[a-z0-9-]+\/$/.test(parsed.pathname);
  if (!isTaeKim && !isTofugu) {
    throw new Error(`Disallowed learner URL: ${url}`);
  }
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'nihongo-path-grammar-reference-preflight/1.0' },
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  console.log(`PASS ${url} ${response.status}`);
}

console.log(`Grammar reference preflight passed: ${urls.length}/${urls.length} unique URLs.`);
