import { describe, expect, it } from 'vitest';

import { getLesson } from '../data/lessons';
import type { SearchLandingTarget } from '../navigation/types';
import {
  calculateSearchTargetY,
  resolveSearchLanding,
  shouldRunSearchLanding,
} from './searchLandingController';

const target: SearchLandingTarget = {
  tab: 'grammar',
  contentId: 'l12-yori-comparison',
  subsection: 'header',
  query: 'より',
  requestToken: 'request-1',
};

describe('search landing controller', () => {
  it('validates grammar and dialogue targets inside the selected lesson', () => {
    const lesson12 = getLesson('lesson-12')!;

    expect(resolveSearchLanding(lesson12, target)).toMatchObject({ valid: true, tab: 'grammar' });
    expect(resolveSearchLanding(lesson12, { ...target, tab: 'dialogue', contentId: 'l12-d04' }))
      .toMatchObject({ valid: true, tab: 'dialogue' });
    expect(resolveSearchLanding(lesson12, { ...target, contentId: 'missing' }))
      .toEqual({ valid: false, tab: 'grammar', target: { ...target, contentId: 'missing' } });
  });

  it('adds all parent offsets and leaves a 16-point top margin', () => {
    expect(calculateSearchTargetY({ tabTop: 420, listTop: 0, targetTop: 180 })).toBe(584);
    expect(calculateSearchTargetY({ tabTop: 420, listTop: 60, targetTop: 180 })).toBe(644);
    expect(calculateSearchTargetY({ tabTop: 4, listTop: 0, targetTop: 3 })).toBe(0);
  });

  it('runs exactly once for each request token', () => {
    expect(shouldRunSearchLanding(null, target)).toBe(true);
    expect(shouldRunSearchLanding('request-1', target)).toBe(false);
    expect(shouldRunSearchLanding('request-1', { ...target, requestToken: 'request-2' })).toBe(true);
    expect(shouldRunSearchLanding(null, undefined)).toBe(false);
  });
});

