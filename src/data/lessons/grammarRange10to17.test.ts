import { describe, expect, it } from 'vitest';

import { lessons } from '.';
import { collectGrammarRangeErrors } from './grammarEnrichmentTestUtils';

describe('grammar enrichment for Lessons 10-17', () => {
  it('meets the frozen content and kana contract', () => {
    expect(collectGrammarRangeErrors({
      firstLesson: 10,
      lastLesson: 17,
      grammarPoints: 32,
      examples: 64,
      dialogueTurns: 53,
      dialogueByLesson: { 10: 6, 11: 6, 12: 6, 13: 6, 14: 7, 15: 7, 16: 7, 17: 8 },
    })).toEqual([]);
  });

  it('makes conjugation and state contrasts explicit', () => {
    const points = new Map(lessons.slice(9, 17).flatMap(({ grammar }) =>
      grammar.map((point) => [point.id, point] as const)));

    expect(points.get('l14-te-form')?.formation?.length).toBeGreaterThanOrEqual(4);
    expect(points.get('l15-continuing-state')?.contrast?.with).toBe('action in progress compared with a continuing state');
    expect(points.get('l17-obligation')?.formation?.some(({ formula }) => formula.includes('なければ'))).toBe(true);
  });

  it('anchors the taught て-form and ない-form algorithms to familiar ～ます forms', () => {
    const points = new Map(
      lessons
        .filter(({ number }) => number === 14 || number === 17)
        .flatMap(({ grammar }) => grammar.map((point) => [point.id, point] as const)),
    );
    const teForm = points.get('l14-te-form');
    const naiForm = points.get('l17-nai-form');
    if (!teForm || !naiForm) throw new Error('Missing Lesson 14 or Lesson 17 formation point');

    for (const required of [
      '～います・～ちます・～ります become ～って',
      '～びます・～みます・～にます become ～んで',
      '～きます becomes ～いて',
      '～ぎます becomes ～いで',
      '～します becomes ～して',
      'Group 2 replaces ～ます with ～て',
      'します becomes して',
      '来ます becomes きて',
      '行きます exceptionally becomes 行って',
    ]) {
      expect(teForm.explanation).toContain(required);
    }

    for (const required of [
      'final i-row kana before ます to the matching a-row kana',
      'removes ます, and adds ない',
      'い becomes わ',
      'Group 2 replaces ます with ない',
      'します becomes しない',
      '来ます becomes こない',
    ]) {
      expect(naiForm.explanation).toContain(required);
    }
    expect(naiForm.usageBoundary).toContain('あります becomes ない');

    for (const point of [teForm, naiForm]) {
      const formationGuidance = [
        point.explanation,
        point.usageBoundary,
        ...(point.notes ?? []),
      ].join(' ');
      expect(formationGuidance).not.toMatch(
        /dictionary form|basic (?:verb )?form|drop(?:s|ping)? (?:final )?る|u-row/u,
      );
    }
  });

  it('keeps the て-form and ない-form algorithm framing independently worded', () => {
    const points = new Map(
      lessons
        .filter(({ number }) => number === 14 || number === 17)
        .flatMap(({ grammar }) => grammar.map((point) => [point.id, point] as const)),
    );

    expect(points.get('l14-te-form')?.explanation).toContain(
      'Start from the familiar ～ます form and identify the verb group.',
    );
    expect(points.get('l17-nai-form')?.explanation).toContain(
      'Use the learned ～ます form to determine the verb group.',
    );
  });

  it('translates the Lesson 16 nonpast action chain as a first-person routine', () => {
    const point = lessons
      .find(({ number }) => number === 16)
      ?.grammar.find(({ id }) => id === 'l16-action-sequence');

    expect(point?.examples[0]).toEqual(expect.objectContaining({
      japanese: '受付へ 行って、名前を 書いて、カードを もらいます。',
      english: 'I go to reception, write my name, and receive a card.',
    }));
  });
});
