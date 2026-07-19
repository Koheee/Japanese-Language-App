import { describe, expect, it } from 'vitest';

import {
  projectReferenceActionStyle,
  referenceActionTextStyle,
  referenceInfluencesCardPresentation,
} from '../components/referenceInfluencesPresentation';
import { colors } from '../theme/tokens';
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
  it('projects the shared copy, link semantics, and assertive error semantics', () => {
    expect(referenceInfluencesCardPresentation).toEqual({
      heading: referenceInfluences.heading,
      paragraphs: [
        referenceInfluences.body,
        referenceInfluences.license,
        referenceInfluences.originality,
        referenceInfluences.nonEndorsement,
      ],
      links: referenceInfluences.links.map((link) => ({
        ...link,
        accessibilityRole: 'link',
        accessibilityLabel: `${link.title}; opens an external site`,
      })),
      errorAccessibility: {
        accessibilityRole: 'alert',
        accessibilityLiveRegion: 'assertive',
      },
    });
  });

  it('keeps 44-pixel geometry fixed while focus and press change visible colors', () => {
    const base = projectReferenceActionStyle({ focused: false, pressed: false });
    const focused = projectReferenceActionStyle({ focused: true, pressed: false });
    const pressed = projectReferenceActionStyle({ focused: false, pressed: true });
    const focusedAndPressed = projectReferenceActionStyle({ focused: true, pressed: true });
    const geometry = ({
      minHeight,
      width,
      alignItems,
      justifyContent,
      paddingHorizontal,
      paddingVertical,
      borderRadius,
      borderWidth,
    }: typeof base) => ({
      minHeight,
      width,
      alignItems,
      justifyContent,
      paddingHorizontal,
      paddingVertical,
      borderRadius,
      borderWidth,
    });

    expect(geometry(base)).toEqual({
      minHeight: 44,
      width: '100%',
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 2,
    });
    expect(geometry(focused)).toEqual(geometry(base));
    expect(geometry(pressed)).toEqual(geometry(base));
    expect(geometry(focusedAndPressed)).toEqual(geometry(base));
    expect(base.borderColor).toBe('transparent');
    expect(focused.borderColor).toBe(colors.forest);
    expect(pressed.backgroundColor).toBe(colors.forestSoft);
    expect(focusedAndPressed).toMatchObject({
      borderColor: colors.forest,
      backgroundColor: colors.forestSoft,
    });
  });

  it('keeps long link labels constrained and shrinkable at iPhone width', () => {
    expect(referenceActionTextStyle).toMatchObject({
      width: '100%',
      flexShrink: 1,
    });
  });
});
