import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import authoredV1 from '../../test/fixtures/authored-vocabulary-v1.json';
import { AUTHORED_BASELINE_FINGERPRINT, canonicalizeAuthoredVocabulary } from '../authoredBaseline';
import { curriculum } from '../curriculum';
import { isKanaReading } from '../../services/vocabularyText';
import { lessons } from '.';

describe('complete curriculum', () => {
  it('contains one ready, fully authored lesson for every number from 1 to 25', () => {
    expect(lessons).toHaveLength(25);
    expect(lessons.map((lesson) => lesson.number)).toEqual(
      Array.from({ length: 25 }, (_, index) => index + 1),
    );
    expect(curriculum).toHaveLength(25);
    expect(curriculum.every((outline) => outline.availability === 'ready')).toBe(true);
    expect(curriculum.every((outline) => lessons.some((lesson) => lesson.id === outline.id))).toBe(true);
  });

  it('uses unique IDs for every authored content entity', () => {
    const ids = lessons.flatMap((lesson) => [
      lesson.id,
      ...lesson.grammar.map((item) => item.id),
      ...lesson.vocabulary.map((item) => item.id),
      ...lesson.dialogue.map((item) => item.id),
      ...lesson.exercises.map((item) => item.id),
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('migrates all and only the 428 authored vocabulary readings to kana', () => {
    const words = lessons.flatMap((lesson) =>
      lesson.vocabulary.map((word, authoredIndex) => ({
        lessonId: lesson.id,
        authoredIndex,
        id: word.id,
        japanese: word.japanese,
        english: word.english,
        partOfSpeech: word.partOfSpeech,
        reading: word.reading,
      })),
    );
    expect(words).toHaveLength(428);
    expect(words.every(({ reading }) => isKanaReading(reading))).toBe(true);
    expect(words.map(({ reading: _reading, ...word }) => word)).toEqual(
      authoredV1.map(({ reading: _reading, ...word }) => word),
    );
    const hash = createHash('sha256').update(canonicalizeAuthoredVocabulary(lessons), 'utf8').digest('hex');
    expect(hash).toBe(AUTHORED_BASELINE_FINGERPRINT);
  });

  it.each(Array.from({ length: 25 }, (_, index) => index + 1))(
    'Lesson %i meets the complete-content contract',
    (lessonNumber) => {
      const lesson = lessons.find((item) => item.number === lessonNumber);
      expect(lesson).toBeDefined();
      if (!lesson) return;

      expect(lesson.availability).toBe('ready');
      expect(lesson.goals.length).toBeGreaterThanOrEqual(3);
      expect(lesson.grammar.length).toBeGreaterThanOrEqual(4);
      expect(lesson.vocabulary.length).toBeGreaterThanOrEqual(15);
      expect(lesson.dialogue.length).toBeGreaterThanOrEqual(6);
      expect(lesson.exercises).toHaveLength(8);

      lesson.grammar.forEach((point) => {
        expect(point.explanation.length).toBeGreaterThan(40);
        expect(point.whyItWorks.length).toBeGreaterThan(40);
        expect(point.examples.length).toBeGreaterThanOrEqual(2);
      });

      lesson.vocabulary.forEach((word) => {
        expect(word.japanese.trim()).not.toBe('');
        expect(word.reading.trim()).not.toBe('');
        expect(word.english.trim()).not.toBe('');
      });

      lesson.dialogue.forEach((turn) => {
        expect(turn.japanese.trim()).not.toBe('');
        expect(turn.reading.trim()).not.toBe('');
        expect(turn.english.trim()).not.toBe('');
      });

      const counts = lesson.exercises.reduce<Record<string, number>>((result, exercise) => {
        result[exercise.type] = (result[exercise.type] ?? 0) + 1;
        return result;
      }, {});
      expect(counts['fill-blank']).toBeGreaterThanOrEqual(2);
      expect(counts.translation).toBeGreaterThanOrEqual(2);
      expect(counts['multiple-choice']).toBeGreaterThanOrEqual(2);
      expect(counts.listening).toBeGreaterThanOrEqual(2);

      lesson.exercises.forEach((exercise) => {
        expect(exercise.explanation.trim()).not.toBe('');
        if (exercise.type === 'fill-blank' || exercise.type === 'translation') {
          expect(exercise.acceptedAnswers.length).toBeGreaterThan(0);
          expect(exercise.acceptedAnswers.every((answer) => answer.trim().length > 0)).toBe(true);
        } else {
          expect(exercise.options.length).toBeGreaterThanOrEqual(3);
          expect(exercise.options.some((option) => option.id === exercise.correctOptionId)).toBe(true);
        }
        if (exercise.type === 'listening') {
          expect(exercise.audioPath).toMatch(/^assets\/audio\/lesson-\d{2}\/.+\.mp3$/);
          expect(exercise.transcript.trim()).not.toBe('');
        }
      });
    },
  );
});
