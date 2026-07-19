import { Lesson } from '../models/content';
import { VocabularyOverrides } from '../models/vocabulary';
import {
  filterResolvedVocabulary,
  resolveVocabularyLists,
} from '../services/vocabularyResolver';

export const buildLessonWordsView = ({
  lesson,
  vocabulary,
  query,
}: {
  lesson: Lesson;
  vocabulary: VocabularyOverrides;
  query: string;
}) => {
  const { active } = resolveVocabularyLists({ lesson, vocabulary });
  const filtered = filterResolvedVocabulary(active, query);

  return {
    visibleCount: active.length,
    filtered,
    emptyState: active.length === 0
      ? 'no-words' as const
      : filtered.length === 0
        ? 'no-matches' as const
        : 'none' as const,
  };
};
