import { Lesson } from '../models/content';
import { ResolvedVocabularyItem, VocabularyOverrides } from '../models/vocabulary';
import { normalizeVocabularyComparison, normalizeVocabularySearch } from './vocabularyText';

const toResolved = (
  lessonId: string,
  item: ResolvedVocabularyItem['item'],
  hidden: boolean,
  sortKey: string,
  authoredIndex?: number,
): ResolvedVocabularyItem => ({
  lessonId,
  item,
  source: item.source ?? 'course',
  editable: (item.source ?? 'course') !== 'course',
  hidden,
  sortKey,
  ...(authoredIndex === undefined ? {} : { authoredIndex }),
  normalizedJapanese: normalizeVocabularyComparison(item.japanese),
  normalizedSearch: [item.japanese, item.reading, item.english, item.category ?? '']
    .map(normalizeVocabularySearch)
    .join('\u001f'),
});

export const resolveVocabularyLists = ({
  lesson,
  vocabulary,
}: {
  lesson: Lesson;
  vocabulary: VocabularyOverrides;
}) => {
  const hiddenIds = new Set(vocabulary.hiddenIdsByLesson[lesson.id] ?? []);
  const authored = lesson.vocabulary.map((item, index) =>
    toResolved(lesson.id, item, hiddenIds.has(item.id), `course:${String(index).padStart(6, '0')}`, index),
  );
  const local = [...(vocabulary.recordsByLesson[lesson.id] ?? [])]
    .sort((left, right) => {
      const sourceOrder = (left.item.source === 'personal-deck' ? 0 : 1)
        - (right.item.source === 'personal-deck' ? 0 : 1);
      return sourceOrder || left.sortKey.localeCompare(right.sortKey) || left.item.id.localeCompare(right.item.id);
    })
    .map((record) => toResolved(lesson.id, record.item, hiddenIds.has(record.item.id), record.sortKey));
  const all = [...authored, ...local];
  return {
    all,
    active: all.filter((word) => !word.hidden),
    hidden: all.filter((word) => word.hidden),
  };
};

export const filterResolvedVocabulary = (items: readonly ResolvedVocabularyItem[], query: string) => {
  const normalized = normalizeVocabularySearch(query);
  return normalized ? items.filter((item) => item.normalizedSearch.includes(normalized)) : [...items];
};

export const findLessonDuplicate = ({
  lesson,
  vocabulary,
  japanese,
  excludeVocabularyId,
}: {
  lesson: Lesson;
  vocabulary: VocabularyOverrides;
  japanese: string;
  excludeVocabularyId?: string;
}) => {
  const normalized = normalizeVocabularyComparison(japanese);
  return resolveVocabularyLists({ lesson, vocabulary }).all.find(
    (word) => word.item.id !== excludeVocabularyId && word.normalizedJapanese === normalized,
  );
};
