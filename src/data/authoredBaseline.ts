import { Lesson } from '../models/content';

export const AUTHORED_BASELINE_FINGERPRINT =
  '25859789e2a3679f09b1ebe6a5f3e981c3c164bf0b8dec7537cd26a0bf933f03' as const;
export const AUTHORED_BASELINE_VERSION =
  `course-v1-${AUTHORED_BASELINE_FINGERPRINT}` as const;

const normalizeHeadword = (value: string) =>
  value.normalize('NFKC').replace(/\p{White_Space}/gu, '');

export const canonicalizeAuthoredVocabulary = (sourceLessons: readonly Lesson[]): string =>
  [...sourceLessons]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((lesson) =>
      [
        lesson.id,
        ...lesson.vocabulary.flatMap((word) => [word.id, normalizeHeadword(word.japanese)]),
      ].join('\u001f'),
    )
    .join('\n');
