import { describe, expect, it } from 'vitest';

import { lesson01 } from '../data/lessons/lesson01';
import { checkExerciseAnswer } from './exerciseEngine';

describe('checkExerciseAnswer', () => {
  it('accepts Japanese answers despite spaces and punctuation', () => {
    const exercise = lesson01.exercises.find((item) => item.id === 'l1-e03');
    expect(exercise && checkExerciseAnswer(exercise, ' わたし は せんせい じゃありません。')).toBe(true);
  });

  it('checks choice IDs exactly', () => {
    const exercise = lesson01.exercises.find((item) => item.id === 'l1-e02');
    expect(exercise && checkExerciseAnswer(exercise, 'a')).toBe(true);
    expect(exercise && checkExerciseAnswer(exercise, 'b')).toBe(false);
  });
});
