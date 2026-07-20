import { describe, expect, it } from 'vitest';

import type { FurtherReading, GrammarPoint } from '../models/content';
import {
  createLatestLessonReferenceAttemptCoordinator,
  createLessonReferenceItems,
  openLessonReference,
} from './lessonReferencePresentation';

const makePoint = (
  id: string,
  furtherReading?: FurtherReading[],
): GrammarPoint => ({
  id,
  title: `Grammar ${id}`,
  pattern: 'A は B です',
  plainEnglish: 'A is B.',
  explanation: 'An explanation.',
  whyItWorks: 'A mental model.',
  usageBoundary: 'A usage boundary.',
  formation: [{
    label: 'Polite noun sentence',
    formula: 'A + は + B + です',
    explanation: 'Build the sentence in this order.',
  }],
  contrast: {
    with: 'は compared with が',
    explanation: 'They organize information differently.',
  },
  examples: [
    { japanese: 'わたしは学生です。', reading: 'わたしはがくせいです。', english: 'I am a student.' },
    { japanese: 'これは本です。', reading: 'これはほんです。', english: 'This is a book.' },
  ],
  furtherReading,
});

const deferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

describe('lesson reference presentation', () => {
  it('deduplicates URLs in first-occurrence order and keeps the first title', () => {
    const firstPoint = makePoint('first', [
      {
        title: "Tae Kim's Guide: Introduction to Particles",
        url: 'https://guidetojapanese.org/learn/grammar/particlesintro',
      },
      {
        title: 'Tofugu: Particle は',
        url: 'https://www.tofugu.com/japanese-grammar/particle-wa/',
      },
    ]);
    const secondPoint = makePoint('second', [
      {
        title: 'A duplicate title that must not replace the first title',
        url: 'https://guidetojapanese.org/learn/grammar/particlesintro',
      },
      {
        title: 'Tofugu: Particle も',
        url: 'https://www.tofugu.com/japanese-grammar/particle-mo/',
      },
    ]);

    expect(createLessonReferenceItems([firstPoint, secondPoint])).toEqual([
      {
        title: "Tae Kim's Guide: Introduction to Particles",
        url: 'https://guidetojapanese.org/learn/grammar/particlesintro',
        accessibilityLabel: "Tae Kim's Guide: Introduction to Particles; opens an external site",
      },
      {
        title: 'Tofugu: Particle は',
        url: 'https://www.tofugu.com/japanese-grammar/particle-wa/',
        accessibilityLabel: 'Tofugu: Particle は; opens an external site',
      },
      {
        title: 'Tofugu: Particle も',
        url: 'https://www.tofugu.com/japanese-grammar/particle-mo/',
        accessibilityLabel: 'Tofugu: Particle も; opens an external site',
      },
    ]);
  });

  it('returns an empty list when no grammar point has references', () => {
    expect(createLessonReferenceItems([])).toEqual([]);
    expect(createLessonReferenceItems([makePoint('none')])).toEqual([]);
  });

  it('does not mutate the lesson grammar or nested reference arrays', () => {
    const points = [makePoint('one', [{
      title: 'Tofugu: Particle は',
      url: 'https://www.tofugu.com/japanese-grammar/particle-wa/',
    }])];
    const before = JSON.stringify(points);

    const items = createLessonReferenceItems(points);

    expect(JSON.stringify(points)).toBe(before);
    expect(items[0]).not.toBe(points[0]!.furtherReading![0]);
  });

  it('opens through the provided receiver-safe callback and returns no error', async () => {
    const receiverDependentOpener = {
      opened: [] as string[],
      async openURL(url: string) {
        if (this !== receiverDependentOpener) throw new Error('detached receiver');
        this.opened.push(url);
      },
    };

    const result = await openLessonReference(
      'https://example.com/reference',
      (url) => receiverDependentOpener.openURL(url),
    );

    expect(receiverDependentOpener.opened).toEqual(['https://example.com/reference']);
    expect(result).toBeNull();
  });

  it('turns an opener rejection into a useful inline error', async () => {
    const result = await openLessonReference(
      'https://example.com/reference',
      async () => { throw new Error('browser unavailable'); },
    );

    expect(result).toBe('Could not open this reference link. Please try again.');
  });
});

describe('latest lesson-reference attempt coordination', () => {
  it('lets a newer failure win over an older success', async () => {
    const coordinator = createLatestLessonReferenceAttemptCoordinator();
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

    newerFailure.reject(new Error('newer failure'));
    await newerAttempt;
    expect(applied).toEqual(['Could not open this reference link. Please try again.']);
  });

  it('keeps a newer success when an older failure finishes later', async () => {
    const coordinator = createLatestLessonReferenceAttemptCoordinator();
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
    olderFailure.reject(new Error('older failure'));
    await olderAttempt;

    expect(applied).toEqual([null]);
  });

  it('drops a late result after the component deactivates on unmount', async () => {
    const coordinator = createLatestLessonReferenceAttemptCoordinator();
    const pending = deferred<void>();
    const applied: Array<string | null> = [];
    const attempt = coordinator.open(
      'https://example.com/pending',
      () => pending.promise,
      (result) => applied.push(result),
    );

    coordinator.deactivate();
    pending.reject(new Error('late failure'));
    await attempt;

    expect(applied).toEqual([]);
  });
});
