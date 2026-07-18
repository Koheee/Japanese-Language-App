import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import authoredVocabulary from '../test/fixtures/authored-vocabulary-v1.json';
import studyState from '../test/fixtures/study-state-v1.json';
import { lessons } from './lessons';
import {
  AUTHORED_BASELINE_FINGERPRINT,
  AUTHORED_BASELINE_VERSION,
  canonicalizeAuthoredVocabulary,
} from './authoredBaseline';

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

describe('authored vocabulary baseline', () => {
  it('freezes 428 words with the reviewed semantic fingerprint', () => {
    expect(lessons.flatMap((lesson) => lesson.vocabulary)).toHaveLength(428);
    expect(sha256(canonicalizeAuthoredVocabulary(lessons))).toBe(AUTHORED_BASELINE_FINGERPRINT);
    expect(AUTHORED_BASELINE_VERSION).toBe(
      'course-v1-25859789e2a3679f09b1ebe6a5f3e981c3c164bf0b8dec7537cd26a0bf933f03',
    );
  });

  it('changes the fingerprint when a headword changes without an ID change', () => {
    const changed = lessons.map((lesson, lessonIndex) => ({
      ...lesson,
      vocabulary: lesson.vocabulary.map((word, wordIndex) =>
        lessonIndex === 0 && wordIndex === 0 ? { ...word, japanese: `${word.japanese}別` } : word,
      ),
    }));
    expect(sha256(canonicalizeAuthoredVocabulary(changed))).not.toBe(AUTHORED_BASELINE_FINGERPRINT);
  });

  it('freezes vocabulary review supporting text with a single middle dot', () => {
    const authoredById = new Map(authoredVocabulary.map((word) => [word.id, word]));
    const vocabularyCards = Object.values(studyState.reviewCards).filter(
      (card) => card.kind === 'vocabulary',
    );

    expect(vocabularyCards).toHaveLength(428);
    for (const card of vocabularyCards) {
      const word = authoredById.get(card.id.replace('review-', ''));
      if (!word) {
        throw new Error(`Missing authored vocabulary for ${card.id}`);
      }
      expect(card.supportingText).toBe(`${word.reading} \u00B7 ${word.partOfSpeech}`);
    }
  });
});
