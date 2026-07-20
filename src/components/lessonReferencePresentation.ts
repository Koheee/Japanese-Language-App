import type { GrammarPoint } from '../models/content';
import { createLatestAttemptCoordinator } from './latestAttemptCoordinator';

export interface LessonReferenceItem {
  title: string;
  url: string;
  accessibilityLabel: string;
}

export const createLessonReferenceItems = (
  points: readonly GrammarPoint[],
): LessonReferenceItem[] => {
  const seenUrls = new Set<string>();
  const items: LessonReferenceItem[] = [];

  for (const point of points) {
    for (const reference of point.furtherReading ?? []) {
      if (seenUrls.has(reference.url)) continue;
      seenUrls.add(reference.url);
      items.push({
        title: reference.title,
        url: reference.url,
        accessibilityLabel: `${reference.title}; opens an external site`,
      });
    }
  }

  return items;
};

export const openLessonReference = async (
  url: string,
  openUrl: (url: string) => Promise<unknown>,
): Promise<string | null> => {
  try {
    await openUrl(url);
    return null;
  } catch {
    return 'Could not open this reference link. Please try again.';
  }
};

export interface LatestLessonReferenceAttemptCoordinator {
  open: (
    url: string,
    openUrl: (url: string) => Promise<unknown>,
    applyResult: (result: string | null) => void,
  ) => Promise<void>;
  deactivate: () => void;
}

export const createLatestLessonReferenceAttemptCoordinator = (
): LatestLessonReferenceAttemptCoordinator => {
  const coordinator = createLatestAttemptCoordinator<string | null>();

  return {
    open: (url, openUrl, applyResult) => coordinator.run(
      () => openLessonReference(url, openUrl),
      applyResult,
    ),
    deactivate: coordinator.deactivate,
  };
};
