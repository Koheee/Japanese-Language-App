import { createHash } from 'node:crypto';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type { GrammarPoint } from '../../models/content';
import authoredV1 from '../../test/fixtures/authored-vocabulary-v1.json';
import { AUTHORED_BASELINE_FINGERPRINT, canonicalizeAuthoredVocabulary } from '../authoredBaseline';
import { curriculum } from '../curriculum';
import { containsHan, containsLatinLetters, isKanaReading } from '../../services/vocabularyText';
import { getGrammarReferences } from '../grammarReferences';
import { FROZEN_GRAMMAR_IDS, GRAMMAR_IDS_BY_LESSON } from './grammarInventory';
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

  it('freezes dialogue presentation and exercise IDs before kana migration', () => {
    expect(
      lessons.map((lesson) => ({
        lessonId: lesson.id,
        dialogue: lesson.dialogue.map(({ id, speaker, japanese, english, grammarIds }) => ({
          id,
          speaker,
          japanese,
          english,
          grammarIds: grammarIds ?? [],
        })),
        exerciseIds: lesson.exercises.map(({ id }) => id),
      })),
    ).toMatchSnapshot();
  });

  it('requires usageBoundary in the GrammarPoint type', () => {
    expectTypeOf<GrammarPoint>().toMatchTypeOf<{ usageBoundary: string }>();
  });

  it('locks the complete enriched grammar inventory and readings', () => {
    expect(lessons).toHaveLength(25);
    expect(lessons.map(({ number }) => number)).toEqual(
      Array.from({ length: 25 }, (_, index) => index + 1),
    );
    expect(lessons.map((lesson) => lesson.grammar.map(({ id }) => id))).toEqual(
      GRAMMAR_IDS_BY_LESSON,
    );

    const points = lessons.flatMap(({ grammar }) => grammar);
    const examples = points.flatMap(({ examples: pointExamples }) => pointExamples);
    const dialogue = lessons.flatMap(({ dialogue: turns }) => turns);
    expect(points.map(({ id }) => id)).toEqual(FROZEN_GRAMMAR_IDS);
    expect(points).toHaveLength(101);
    expect(examples).toHaveLength(202);
    expect(dialogue).toHaveLength(173);

    for (const point of points) {
      expect(point.explanation.trim().length).toBeGreaterThan(40);
      expect(point.whyItWorks.trim().length).toBeGreaterThan(40);
      expect(point.usageBoundary.trim().length).toBeGreaterThan(20);
      expect(point.examples).toHaveLength(2);
      const references = getGrammarReferences(point.id);
      if (references.length) expect(point.furtherReading).toEqual(references);
      else expect(point).not.toHaveProperty('furtherReading');
      if (point.commonMistake) {
        expect(point.commonMistake.avoid.trim()).not.toBe('');
        expect(point.commonMistake.prefer.trim()).not.toBe('');
        expect(point.commonMistake.reason.trim()).not.toBe('');
      }
      for (const example of point.examples) {
        expect(example.japanese.trim()).not.toBe('');
        expect(example.english.trim()).not.toBe('');
        if (containsHan(example.japanese)) expect(example.reading?.trim()).toBeTruthy();
        if (example.reading) {
          expect(isKanaReading(example.reading)).toBe(true);
          expect(containsLatinLetters(example.reading)).toBe(false);
        }
      }
    }

    for (const lesson of lessons) {
      expect(lesson.grammar.some(({ whyItWorks }) => whyItWorks.trim().length > 40)).toBe(true);
      const sameLessonGrammarIds = new Set(lesson.grammar.map(({ id }) => id));
      for (const turn of lesson.dialogue) {
        expect(isKanaReading(turn.reading)).toBe(true);
        expect(containsLatinLetters(turn.reading)).toBe(false);
        for (const grammarId of turn.grammarIds ?? []) {
          expect(sameLessonGrammarIds.has(grammarId)).toBe(true);
        }
      }
    }
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
