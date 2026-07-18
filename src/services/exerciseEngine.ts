import { Exercise } from '../models/content';

export type ExerciseResponse = string;

const normalize = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase()
    .normalize('NFKC')
    .replace(/[。！？!?.,'’“”"]/g, '')
    .replace(/\s+/g, '');

export const checkExerciseAnswer = (
  exercise: Exercise,
  response: ExerciseResponse,
): boolean => {
  if (exercise.type === 'multiple-choice' || exercise.type === 'listening') {
    return response === exercise.correctOptionId;
  }

  const normalizedResponse = normalize(response);
  return exercise.acceptedAnswers.some(
    (answer) => normalize(answer) === normalizedResponse,
  );
};

export const getAnswerLabel = (exercise: Exercise): string => {
  if (exercise.type === 'multiple-choice' || exercise.type === 'listening') {
    return (
      exercise.options.find((option) => option.id === exercise.correctOptionId)
        ?.label ?? ''
    );
  }

  return exercise.acceptedAnswers[0] ?? '';
};
