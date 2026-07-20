import type { Lesson } from '../models/content';
import type { SearchLandingTarget } from '../navigation/types';

export interface SearchTargetOffsets {
  tabTop: number;
  listTop: number;
  targetTop: number;
}

export const calculateSearchTargetY = ({ tabTop, listTop, targetTop }: SearchTargetOffsets): number =>
  Math.max(0, tabTop + listTop + targetTop - 16);

export const shouldRunSearchLanding = (
  consumedRequestToken: string | null,
  target: SearchLandingTarget | undefined,
): boolean => Boolean(target && target.requestToken !== consumedRequestToken);

export function resolveSearchLanding(lesson: Lesson, target: SearchLandingTarget) {
  const valid = target.tab === 'grammar'
    ? lesson.grammar.some((point) => point.id === target.contentId)
    : lesson.dialogue.some((turn) => turn.id === target.contentId);
  return { valid, tab: target.tab, target } as const;
}

