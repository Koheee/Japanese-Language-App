import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createLatestReferenceAttemptCoordinator,
  openReferenceInfluence,
  referenceInfluences,
} from './referenceInfluences';

const deferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

describe('reference influences copy', () => {
  it('states source, license, independent authorship, and non-endorsement exactly', () => {
    expect(referenceInfluences).toEqual({
      heading: 'Reference influences',
      body: "Tae Kim's Guide to Japanese Grammar informed this course's Japanese-first coverage review.",
      license: 'The guide identifies its content as CC BY-NC-SA 3.0 US.',
      originality: "Nihongo Path's explanations, examples, dialogues, and exercises are independently written.",
      nonEndorsement: 'Neither Tae Kim nor the Saeris project endorses Nihongo Path.',
      links: [
        { title: "Tae Kim's Guide to Japanese Grammar", url: 'https://guidetojapanese.org/learn/grammar/' },
        { title: 'Saeris guide-to-japanese port', url: 'https://github.com/Saeris/guide-to-japanese' },
      ],
    });
  });

  it('opens a reference link without detaching a receiver-dependent opener', async () => {
    const receiverDependentOpener = {
      opened: [] as string[],
      async openURL(url: string) {
        if (this !== receiverDependentOpener) {
          throw new Error('openURL receiver was detached');
        }
        this.opened.push(url);
      },
    };

    const result = await openReferenceInfluence(
      'https://example.com/reference',
      (url) => receiverDependentOpener.openURL(url),
    );

    expect(receiverDependentOpener.opened).toEqual(['https://example.com/reference']);
    expect(result).toBeNull();
  });

  it('turns a rejected reference opener into a concise user-facing error', async () => {
    const result = await openReferenceInfluence(
      'https://example.com/reference',
      async () => { throw new Error('browser unavailable'); },
    );

    expect(result).toBe('Could not open this reference link. Please try again.');
  });

  it('ignores an older success when the newer attempt later fails', async () => {
    const coordinator = createLatestReferenceAttemptCoordinator();
    const olderSuccess = deferred<void>();
    const newerFailure = deferred<void>();
    const applied: Array<string | null> = [];

    const olderAttempt = coordinator.open(
      'https://example.com/older',
      () => olderSuccess.promise,
      (result) => applied.push(result),
    );
    const newerAttempt = coordinator.open(
      'https://example.com/newer',
      () => newerFailure.promise,
      (result) => applied.push(result),
    );

    olderSuccess.resolve();
    await olderAttempt;
    expect(applied).toEqual([]);

    newerFailure.reject(new Error('newer browser failure'));
    await newerAttempt;
    expect(applied).toEqual(['Could not open this reference link. Please try again.']);
  });

  it('keeps a newer success when the older attempt later fails', async () => {
    const coordinator = createLatestReferenceAttemptCoordinator();
    const olderFailure = deferred<void>();
    const newerSuccess = deferred<void>();
    const applied: Array<string | null> = [];

    const olderAttempt = coordinator.open(
      'https://example.com/older',
      () => olderFailure.promise,
      (result) => applied.push(result),
    );
    const newerAttempt = coordinator.open(
      'https://example.com/newer',
      () => newerSuccess.promise,
      (result) => applied.push(result),
    );

    newerSuccess.resolve();
    await newerAttempt;
    expect(applied).toEqual([null]);

    olderFailure.reject(new Error('older browser failure'));
    await olderAttempt;
    expect(applied).toEqual([null]);
  });
});

describe('reference influences presentation contract', () => {
  const progressSource = readFileSync(
    join(import.meta.dirname, '../screens/ProgressScreen.tsx'),
    'utf8',
  );
  const readmeSource = readFileSync(join(import.meta.dirname, '../../README.md'), 'utf8')
    .replaceAll('\r\n', '\n');

  it('renders the shared copy immediately after vocabulary backup and before study content', () => {
    const backupIndex = progressSource.indexOf('<View style={styles.backupCard}>');
    const referenceIndex = progressSource.indexOf('<View style={styles.referenceCard}>');
    const lessonActivityIndex = progressSource.indexOf('<Text style={styles.sectionTitle}>Lesson activity</Text>');
    const principleIndex = progressSource.indexOf('<View style={styles.principle}>');

    expect(backupIndex).toBeGreaterThan(-1);
    expect(referenceIndex).toBeGreaterThan(backupIndex);
    expect(referenceIndex).toBeLessThan(lessonActivityIndex);
    expect(referenceIndex).toBeLessThan(principleIndex);
    expect(progressSource).toContain('{referenceInfluences.heading}');
    expect(progressSource).toContain('{referenceInfluences.body}');
    expect(progressSource).toContain('{referenceInfluences.license}');
    expect(progressSource).toContain('{referenceInfluences.originality}');
    expect(progressSource).toContain('{referenceInfluences.nonEndorsement}');
    expect(progressSource).toContain('referenceInfluences.links.map((link) =>');
  });

  it('gives links accessible labels, fixed focus geometry, press feedback, and wrapping text', () => {
    const baseStyle = progressSource.match(
      /referenceAction:\s*\{[\s\S]*?\n\s*\},\n\s*referenceActionFocused:/,
    )?.[0];
    const focusedStyle = progressSource.match(/referenceActionFocused:\s*\{[^}]*\}/)?.[0];
    const pressedStyle = progressSource.match(/referenceActionPressed:\s*\{[^}]*\}/)?.[0];
    const textStyle = progressSource.match(/referenceActionText:\s*\{[\s\S]*?\n\s*\}/)?.[0];

    expect(progressSource).toContain('accessibilityRole="link"');
    expect(progressSource).toContain('accessibilityLabel={`${link.title}; opens an external site`}');
    expect(progressSource).toContain('focusedReferenceUrl === link.url && styles.referenceActionFocused');
    expect(progressSource).toContain('pressed && styles.referenceActionPressed');
    expect(baseStyle).toContain('minHeight: 44');
    expect(baseStyle).toContain('width: \'100%\'');
    expect(baseStyle).toContain('borderWidth: 2');
    expect(focusedStyle).toContain('borderColor: colors.forest');
    expect(focusedStyle).not.toContain('borderWidth');
    expect(pressedStyle).toContain('backgroundColor: colors.forestSoft');
    expect(textStyle).toContain('flexShrink: 1');
  });

  it('uses one latest-attempt coordinator and reports rejection in an assertive alert', () => {
    const referenceCard = progressSource.match(
      /<View style=\{styles\.referenceCard\}>[\s\S]*?<Text style=\{styles\.sectionTitle\}>Lesson activity<\/Text>/,
    )?.[0];

    expect(progressSource).toContain('createLatestReferenceAttemptCoordinator()');
    expect(progressSource).toContain('referenceAttemptCoordinatorRef.current ??=');
    expect(progressSource).toContain('referenceAttemptCoordinator.open(');
    expect(progressSource).toContain('(targetUrl) => Linking.openURL(targetUrl)');
    expect(progressSource).not.toContain('referenceAttemptCoordinator.open(url, Linking.openURL');
    expect(progressSource).toContain('if (mountedRef.current) setReferenceError(message)');
    expect(referenceCard).toContain('accessibilityRole="alert"');
    expect(referenceCard).toContain('accessibilityLiveRegion="assertive"');
    expect(referenceCard).toContain('{referenceError}');
  });

  it('includes the exact matching README attribution section', () => {
    expect(readmeSource).toContain(`## Reference influences

[Tae Kim's Guide to Japanese Grammar](https://guidetojapanese.org/learn/grammar/) informed this course's Japanese-first coverage review. The guide identifies its content as CC BY-NC-SA 3.0 US.

The [Saeris guide-to-japanese port](https://github.com/Saeris/guide-to-japanese) was used as a structured review aid. Nihongo Path's explanations, examples, dialogues, and exercises are independently written. Neither Tae Kim nor the Saeris project endorses Nihongo Path. No source prose, examples, media, or website code is included.`);
  });
});
