import { describe, expect, it } from 'vitest';

import { ReviewCard } from '../models/review';
import { getDueCards, getReviewStats, scheduleReview } from './srs';

const card: ReviewCard = {
  id: 'review-test',
  lessonId: 'lesson-01',
  kind: 'vocabulary',
  prompt: 'がくせい',
  answer: 'student',
  dueAt: '2026-01-01T00:00:00.000Z',
  intervalDays: 0,
  repetitions: 0,
  ease: 2.5,
};

describe('scheduleReview', () => {
  it('brings Again cards back in ten minutes', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const result = scheduleReview(card, 'again', now);
    expect(new Date(result.dueAt).getTime() - now.getTime()).toBe(10 * 60 * 1000);
    expect(result.repetitions).toBe(0);
  });

  it('gives a new Good card a one-day interval', () => {
    const result = scheduleReview(card, 'good', new Date('2026-01-01T00:00:00.000Z'));
    expect(result.intervalDays).toBe(1);
    expect(result.repetitions).toBe(1);
  });

  it('gives Easy a longer first interval than Good', () => {
    const easy = scheduleReview(card, 'easy', new Date('2026-01-01T00:00:00.000Z'));
    const good = scheduleReview(card, 'good', new Date('2026-01-01T00:00:00.000Z'));
    expect(easy.intervalDays).toBeGreaterThan(good.intervalDays);
  });

  it('excludes suspended cards from the due queue', () => {
    const due = { ...card, dueAt: '2026-01-01T00:00:00.000Z' };
    const suspended = { ...due, id: 'review-suspended', suspended: true };
    expect(getDueCards({ [due.id]: due, [suspended.id]: suspended }, new Date('2026-01-02T00:00:00.000Z')))
      .toEqual([due]);
  });

  it('excludes suspended cards from deck and reviewed statistics', () => {
    expect(getReviewStats({
      active: { ...card, id: 'active', lastReviewedAt: '2026-01-01T00:00:00.000Z' },
      suspended: {
        ...card,
        id: 'suspended',
        suspended: true,
        lastReviewedAt: '2026-01-01T00:00:00.000Z',
      },
    })).toEqual({ activeTotal: 1, reviewedActive: 1 });
  });
});
