import { describe, expect, it } from 'vitest';

import { PersistedAppStateV2 } from '../models/appState';
import { Lesson } from '../models/content';
import { ReviewCard } from '../models/review';
import { DeviceVocabularyRecord, VocabularyOverrides } from '../models/vocabulary';
import { resolveVocabularyLists } from './vocabularyResolver';
import {
  VocabularyDraft,
  buildAddVocabularyState,
  buildEditVocabularyState,
  buildHideVocabularyState,
  buildRestoreVocabularyState,
  buildTemporaryVocabularyUndoState,
  validateVocabularyDraft,
} from './vocabularyMutations';

const now = new Date('2026-07-18T00:00:00.000Z');
const later = new Date('2026-07-18T00:01:00.000Z');
const latest = new Date('2026-07-18T00:02:00.000Z');
const uuid = '11111111-1111-4111-8111-111111111111';

const lesson01: Lesson = {
  id: 'lesson-01',
  number: 1,
  title: 'Introductions',
  japaneseTitle: 'はじめまして',
  description: 'Fixture lesson one',
  durationMinutes: 10,
  theme: 'People',
  availability: 'ready',
  goals: [],
  grammar: [],
  vocabulary: [
    {
      id: 'course-word',
      japanese: '学生',
      reading: 'がくせい',
      english: 'student',
      partOfSpeech: 'noun',
      category: 'People',
    },
    {
      id: 'course-hidden',
      japanese: '先生',
      reading: 'せんせい',
      english: 'teacher',
      partOfSpeech: 'noun',
      category: 'People',
    },
  ],
  dialogue: [],
  exercises: [],
};

const lesson02: Lesson = {
  ...lesson01,
  id: 'lesson-02',
  number: 2,
  title: 'Languages',
  japaneseTitle: 'ことば',
  description: 'Fixture lesson two',
  vocabulary: [],
};

const lessons = [lesson01, lesson02];

const localRecord: DeviceVocabularyRecord = {
  lessonId: 'lesson-02',
  createdAt: '2026-07-16T00:00:00.000Z',
  updatedAt: '2026-07-16T00:00:00.000Z',
  sortKey: 'personal-deck:00000001',
  item: {
    id: 'personal-deck:lesson-02:1',
    japanese: '日本語',
    reading: 'にほんご',
    english: 'Japanese language',
    partOfSpeech: 'vocabulary',
    category: 'Languages',
    source: 'personal-deck',
    sourceId: 'L02-01',
  },
};

const reviewCard = (
  id: string,
  lessonId: string,
  prompt: string,
  answer: string,
  suspended = false,
): ReviewCard => ({
  id: `review-${id}`,
  lessonId,
  kind: 'vocabulary',
  prompt,
  answer,
  dueAt: '2026-08-18T00:00:00.000Z',
  intervalDays: 12,
  repetitions: 4,
  ease: 2.35,
  lastReviewedAt: '2026-07-17T12:00:00.000Z',
  suspended,
});

const vocabulary = (): VocabularyOverrides => ({
  recordsByLesson: { 'lesson-02': [localRecord] },
  hiddenIdsByLesson: { 'lesson-01': ['course-hidden'] },
  updatedAt: '2026-07-17T00:00:00.000Z',
});

const currentState = (): PersistedAppStateV2 => ({
  schemaVersion: 2,
  authoredBaselineVersion: 'fixture-baseline',
  progress: {
    'lesson-01': {
      lessonId: 'lesson-01',
      started: true,
      completedExerciseIds: [],
      correctAnswers: 0,
      attempts: 0,
    },
    'lesson-02': {
      lessonId: 'lesson-02',
      started: true,
      completedExerciseIds: [],
      correctAnswers: 0,
      attempts: 0,
    },
  },
  reviewCards: {
    'review-course-word': reviewCard('course-word', 'lesson-01', '学生', 'student'),
    'review-course-hidden': reviewCard('course-hidden', 'lesson-01', '先生', 'teacher', true),
    'review-personal-deck:lesson-02:1': reviewCard(
      'personal-deck:lesson-02:1',
      'lesson-02',
      localRecord.item.japanese,
      localRecord.item.english,
    ),
    'review-orphan': reviewCard('orphan', 'lesson-01', 'orphan', 'retained', true),
  },
  vocabulary: vocabulary(),
  lastImportRecovery: {
    previousVocabulary: vocabulary(),
    previousAffectedReviewCards: {},
    affectedReviewCardIds: [],
    authoredBaselineVersion: 'fixture-baseline',
    importedAt: '2026-07-17T00:00:00.000Z',
  },
});

const draft: VocabularyDraft = {
  japanese: 'かな',
  reading: '',
  english: 'kana',
};

const editedDraft: VocabularyDraft = {
  japanese: '  日本 の ことば  ',
  reading: 'にほん の ことば',
  english: '  Japanese words  ',
  category: '  Languages and writing  ',
};

const options = { lessons, now, uuid };

const pickSchedule = (card: ReviewCard) => ({
  dueAt: card.dueAt,
  intervalDays: card.intervalDays,
  repetitions: card.repetitions,
  ease: card.ease,
  lastReviewedAt: card.lastReviewedAt,
});

const getLocalRecord = (state: PersistedAppStateV2) =>
  state.vocabulary.recordsByLesson['lesson-02']?.find(
    ({ item }) => item.id === localRecord.item.id,
  )!;

const resolve = (state: PersistedAppStateV2, lesson = lesson01) =>
  resolveVocabularyLists({ lesson, vocabulary: state.vocabulary });

describe('vocabulary mutations', () => {
  it('adds a normalized custom item with stable namespace/order and reconciles a started lesson', () => {
    const current = currentState();
    const next = buildAddVocabularyState(current, 'lesson-01', {
      japanese: '  かな  ',
      reading: '   ',
      english: '  kana  ',
      category: '   ',
    }, options);
    const record = next.vocabulary.recordsByLesson['lesson-01']?.[0];

    expect(record).toMatchObject({
      lessonId: 'lesson-01',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      item: {
        id: `custom:lesson-01:${uuid}`,
        japanese: 'かな',
        reading: 'かな',
        english: 'kana',
        source: 'custom',
        partOfSpeech: 'vocabulary',
      },
    });
    expect(record?.item).not.toHaveProperty('category');
    expect(record?.sortKey).toBe(`custom:2026-07-18T00:00:00.000Z:${uuid}`);
    expect(next.reviewCards[`review-${record?.item.id}`]).toBeDefined();
    expect(next.lastImportRecovery).toBeUndefined();
  });

  it.each([
    [{ japanese: '', reading: 'かな', english: 'x' }, 'Japanese is required'],
    [{ japanese: 'かな', reading: 'かな', english: '' }, 'English is required'],
    [{ japanese: '漢字', reading: '', english: 'kanji' }, 'Kana reading is required'],
    [{ japanese: 'かな', reading: 'romaji', english: 'kana' }, 'Reading must use kana'],
  ])('rejects invalid draft %j', (invalid, message) => {
    expect(() => buildAddVocabularyState(currentState(), 'lesson-01', invalid, options)).toThrow(message);
  });

  it('normalizes only surrounding draft whitespace and preserves internal whitespace', () => {
    expect(validateVocabularyDraft(editedDraft)).toEqual({
      japanese: '日本 の ことば',
      reading: 'にほん の ことば',
      english: 'Japanese words',
      category: 'Languages and writing',
    });
  });

  it('uses the shared active-and-hidden duplicate predicate but allows another lesson', () => {
    const current = currentState();
    expect(() => buildAddVocabularyState(current, 'lesson-01', {
      ...draft,
      japanese: '学 生',
      reading: 'がくせい',
    }, options))
      .toThrow(/already exists in Lesson 1/);
    expect(() => buildAddVocabularyState(current, 'lesson-01', {
      ...draft,
      japanese: '先 生',
      reading: 'せんせい',
    }, options))
      .toThrow(/already exists in Lesson 1/);
    expect(() => buildAddVocabularyState(current, 'lesson-02', {
      ...draft,
      japanese: '学生',
      reading: 'がくせい',
    }, options))
      .not.toThrow();
  });

  it('edits personal/custom presentation while preserving identity, order, source, and schedule', () => {
    const current = currentState();
    const beforeRecord = getLocalRecord(current);
    const cardId = `review-${beforeRecord.item.id}`;
    const beforeSchedule = pickSchedule(current.reviewCards[cardId]!);
    const next = buildEditVocabularyState(
      current,
      beforeRecord.lessonId,
      beforeRecord.item.id,
      editedDraft,
      { lessons, now },
    );
    const afterRecord = getLocalRecord(next);

    expect(afterRecord).toMatchObject({
      lessonId: beforeRecord.lessonId,
      createdAt: beforeRecord.createdAt,
      sortKey: beforeRecord.sortKey,
      item: {
        id: beforeRecord.item.id,
        source: beforeRecord.item.source,
        sourceId: beforeRecord.item.sourceId,
        japanese: '日本 の ことば',
        english: 'Japanese words',
      },
    });
    expect(pickSchedule(next.reviewCards[cardId]!)).toEqual(beforeSchedule);
    expect(next.reviewCards[cardId]).toMatchObject({
      prompt: '日本 の ことば',
      answer: 'Japanese words',
    });
    expect(next.lastImportRecovery).toBeUndefined();
  });

  it('excludes the edited record from duplicates but still rejects another word in its lesson', () => {
    const current = currentState();
    expect(() => buildEditVocabularyState(
      current,
      'lesson-02',
      localRecord.item.id,
      { japanese: '日本 語', reading: 'にほんご', english: 'Japanese' },
      { lessons, now },
    )).not.toThrow();

    const lessonWithDuplicate = {
      ...lesson02,
      vocabulary: [{
        id: 'course-language',
        japanese: 'ことば',
        reading: 'ことば',
        english: 'language',
        partOfSpeech: 'noun',
      }],
    };
    expect(() => buildEditVocabularyState(
      current,
      'lesson-02',
      localRecord.item.id,
      { japanese: 'こと ば', reading: 'ことば', english: 'language' },
      { lessons: [lesson01, lessonWithDuplicate], now },
    )).toThrow(/already exists in Lesson 2/);
  });

  it('never edits an authored item or a missing local item', () => {
    expect(() => buildEditVocabularyState(
      currentState(),
      'lesson-01',
      'course-word',
      editedDraft,
      { lessons, now },
    )).toThrow('Authored vocabulary cannot be edited.');
    expect(() => buildEditVocabularyState(
      currentState(),
      'lesson-02',
      'custom:lesson-02:missing',
      editedDraft,
      { lessons, now },
    )).toThrow(/not found/i);
  });

  it.each([
    ['lesson-01', 'course-word'],
    ['lesson-02', localRecord.item.id],
  ])('hides/restores authored or local item %s/%s with the same schedule', (lessonId, vocabularyId) => {
    const current = currentState();
    const cardId = `review-${vocabularyId}`;
    const { state: hidden, undoToken } = buildHideVocabularyState(
      current,
      lessonId,
      vocabularyId,
      { lessons, now },
    );
    const lesson = lessons.find(({ id }) => id === lessonId)!;

    expect(resolve(hidden, lesson).active.some(({ item }) => item.id === vocabularyId)).toBe(false);
    expect(hidden.reviewCards[cardId]?.suspended).toBe(true);
    expect(undoToken).toEqual({
      kind: 'restore',
      lessonId,
      vocabularyId,
      expectedVocabularyUpdatedAt: hidden.vocabulary.updatedAt,
    });

    const restored = buildRestoreVocabularyState(hidden, lessonId, vocabularyId, { lessons, now: later });
    expect(restored.state.reviewCards[cardId]?.suspended).toBe(false);
    expect(pickSchedule(restored.state.reviewCards[cardId]!)).toEqual(
      pickSchedule(current.reviewCards[cardId]!),
    );
    expect(restored.undoToken.kind).toBe('hide');
    expect(restored.state.lastImportRecovery).toBeUndefined();
  });

  it('rejects invalid lesson, hide, and restore preconditions before producing state', () => {
    const current = currentState();
    expect(() => buildHideVocabularyState(current, 'lesson-missing', 'course-word', { lessons, now }))
      .toThrow(/lesson-missing/i);
    expect(() => buildHideVocabularyState(current, 'lesson-01', 'course-hidden', { lessons, now }))
      .toThrow(/already hidden/i);
    expect(() => buildRestoreVocabularyState(current, 'lesson-01', 'course-word', { lessons, now }))
      .toThrow(/not hidden/i);
    expect(() => buildHideVocabularyState(current, 'lesson-01', 'missing-word', { lessons, now }))
      .toThrow(/not found/i);
  });

  it('applies only the immediately matching temporary undo token and rejects replays', () => {
    const current = currentState();
    const hidden = buildHideVocabularyState(current, 'lesson-01', 'course-word', { lessons, now });
    const undone = buildTemporaryVocabularyUndoState(hidden.state, hidden.undoToken, { lessons, now: later });
    expect(undone.vocabulary.hiddenIdsByLesson['lesson-01']).not.toContain('course-word');
    expect(undone.lastImportRecovery).toBeUndefined();

    const changed = buildAddVocabularyState(hidden.state, 'lesson-01', draft, {
      lessons,
      now: later,
      uuid,
    });
    expect(() => buildTemporaryVocabularyUndoState(changed, hidden.undoToken, { lessons, now: latest }))
      .toThrow('This undo has expired.');
    expect(() => buildTemporaryVocabularyUndoState(undone, hidden.undoToken, { lessons, now: latest }))
      .toThrow('This undo has expired.');
  });

  it('advances vocabulary revisions monotonically for same-millisecond mutations', () => {
    const current = currentState();
    current.vocabulary.updatedAt = now.toISOString();

    const added = buildAddVocabularyState(current, 'lesson-01', draft, options);
    const hidden = buildHideVocabularyState(added, 'lesson-01', 'course-word', { lessons, now });

    expect(added.vocabulary.updatedAt).toBe('2026-07-18T00:00:00.001Z');
    expect(hidden.state.vocabulary.updatedAt).toBe('2026-07-18T00:00:00.002Z');
    expect(hidden.undoToken.expectedVocabularyUpdatedAt).toBe('2026-07-18T00:00:00.002Z');
  });

  it('clones only affected vocabulary branches and retains every review card', () => {
    const current = currentState();
    const added = buildAddVocabularyState(current, 'lesson-01', draft, options);

    expect(added).not.toBe(current);
    expect(added.progress).toBe(current.progress);
    expect(added.vocabulary).not.toBe(current.vocabulary);
    expect(added.vocabulary.recordsByLesson).not.toBe(current.vocabulary.recordsByLesson);
    expect(added.vocabulary.recordsByLesson['lesson-02']).toBe(
      current.vocabulary.recordsByLesson['lesson-02'],
    );
    expect(added.vocabulary.hiddenIdsByLesson).toBe(current.vocabulary.hiddenIdsByLesson);
    expect(added.reviewCards['review-orphan']).toBe(current.reviewCards['review-orphan']);
    expect(Object.keys(added.reviewCards)).toEqual(expect.arrayContaining(Object.keys(current.reviewCards)));

    const hidden = buildHideVocabularyState(current, 'lesson-01', 'course-word', { lessons, now }).state;
    expect(hidden.vocabulary.recordsByLesson).toBe(current.vocabulary.recordsByLesson);
    expect(hidden.vocabulary.hiddenIdsByLesson).not.toBe(current.vocabulary.hiddenIdsByLesson);
    expect(hidden.vocabulary.hiddenIdsByLesson['lesson-01']).not.toBe(
      current.vocabulary.hiddenIdsByLesson['lesson-01'],
    );
  });
});
