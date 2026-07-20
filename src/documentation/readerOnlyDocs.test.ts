import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');
const readDoc = (name: string) => readFileSync(join(root, name), 'utf8');

describe.each(['README.md', 'GITHUB_PAGES.md'])('%s reader-only documentation', (name) => {
  const doc = readDoc(name);

  it('describes only the visible reader journey', () => {
    expect(doc).toContain('Lesson list â†’ Lesson Detail');
    expect(doc).toContain('Overview, Grammar, and Dialogue');
    expect(doc).toContain('no visible management UI');
    expect(doc).toContain('does not sync');

    for (const staleClaim of [
      'Learn, Review, and Progress navigation tabs',
      'public app includes the vocabulary manager',
      'public site ships the vocabulary manager',
      'export from Progress',
      'choose it with the iPhone file picker',
    ]) {
      expect(doc.toLowerCase()).not.toContain(staleClaim.toLowerCase());
    }
  });

  it('gives the non-destructive iPhone update and offline checklist', () => {
    expect(doc).toMatch(/do not uninstall/i);
    expect(doc).toMatch(/do not clear (?:Safari )?(?:website|site) data/i);
    expect(doc).toMatch(/open .* online/i);
    expect(doc).toMatch(/close .*reopen/i);
    expect(doc).toContain('quick-switcher');
    expect(doc).toContain('safe areas');
    expect(doc).toContain('VoiceOver');
    expect(doc).toMatch(/airplane mode/i);
  });
});
