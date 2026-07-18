import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { lessons } from '../src/data/lessons';

const authoredPath = resolve('src/test/fixtures/authored-vocabulary-v1.json');
const studyPath = resolve('src/test/fixtures/study-state-v1.json');
if (existsSync(authoredPath) || existsSync(studyPath)) {
  throw new Error('V1 fixtures already exist; refusing to overwrite frozen migration evidence.');
}

const frozenAt = '2026-07-18T00:00:00.000Z';
const authored = lessons.flatMap((lesson) =>
  lesson.vocabulary.map((word, index) => ({
    lessonId: lesson.id,
    authoredIndex: index,
    id: word.id,
    japanese: word.japanese,
    reading: word.reading,
    english: word.english,
    partOfSpeech: word.partOfSpeech,
  })),
);
const progress = Object.fromEntries(
  lessons.map((lesson) => [
    lesson.id,
    {
      lessonId: lesson.id,
      started: true,
      completedExerciseIds: [],
      correctAnswers: 0,
      attempts: 0,
    },
  ]),
);
const reviewCards = Object.fromEntries(
  authored.map((word, index) => [
    `review-${word.id}`,
    {
      id: `review-${word.id}`,
      lessonId: word.lessonId,
      kind: 'vocabulary',
      prompt: word.japanese,
      answer: word.english,
      supportingText: `${word.reading} · ${word.partOfSpeech}`,
      dueAt: frozenAt,
      intervalDays: index % 7,
      repetitions: index % 4,
      ease: 2.5,
      ...(index % 3 === 0 ? { lastReviewedAt: frozenAt } : {}),
    },
  ]),
);
reviewCards['review-l1-topic-copula'] = {
  id: 'review-l1-topic-copula',
  lessonId: 'lesson-01',
  kind: 'grammar',
  prompt: 'STALE V1 GRAMMAR PROMPT',
  answer: 'STALE V1 GRAMMAR ANSWER',
  supportingText: 'STALE V1 GRAMMAR SUPPORT',
  dueAt: '2026-07-25T00:00:00.000Z',
  intervalDays: 7,
  repetitions: 3,
  ease: 2.35,
  lastReviewedAt: frozenAt,
};

const main = async () => {
  await mkdir(dirname(authoredPath), { recursive: true });
  await writeFile(authoredPath, `${JSON.stringify(authored, null, 2)}\n`, 'utf8');
  await writeFile(studyPath, `${JSON.stringify({ progress, reviewCards }, null, 2)}\n`, 'utf8');
  console.log(`Frozen ${authored.length} authored words, ${authored.length} vocabulary cards, and one stale grammar card.`);
};

void main();
