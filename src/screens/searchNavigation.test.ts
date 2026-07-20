import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(join(root, relativePath), 'utf8');

describe('global search navigation wiring', () => {
  it('registers Search as the only new live reader route', () => {
    const source = read('navigation/AppNavigator.tsx');

    expect(source).toContain("import { SearchScreen } from '../screens/SearchScreen'");
    expect(source.match(/<LearnStack\.Screen/g)).toHaveLength(3);
    expect(source).toContain('<LearnStack.Screen name="Lessons"');
    expect(source).toContain('<LearnStack.Screen name="LessonDetail"');
    expect(source).toContain('<LearnStack.Screen name="Search"');
    for (const forbidden of ['ExerciseScreen', 'ReviewScreen', 'ProgressScreen', 'VocabularyManagerScreen', 'WordEditorScreen']) {
      expect(source).not.toContain(forbidden);
    }
  });

  it('shows the shared Search button on the lesson list and lesson detail header', () => {
    const list = read('screens/LessonListScreen.tsx');
    const detail = read('screens/LessonDetailScreen.tsx');

    for (const source of [list, detail]) {
      expect(source).toContain("import { SearchButton } from '../components/SearchButton'");
      expect(source).toContain("navigation.navigate('Search')");
      expect(source).toContain('<SearchButton');
    }
  });

  it('pushes a result target while ordinary lesson navigation remains target-free', () => {
    const search = read('screens/SearchScreen.tsx');
    const list = read('screens/LessonListScreen.tsx');
    const detail = read('screens/LessonDetailScreen.tsx');

    expect(search).toContain("navigation.push('LessonDetail'");
    for (const field of ['lessonId', 'tab', 'contentId', 'subsection', 'grammarId', 'query', 'requestToken']) {
      expect(search).toContain(`${field}:`);
    }
    expect(list).toContain("navigation.navigate('LessonDetail', { lessonId: item.id })");
    expect(detail).toContain('navigation.setParams({ lessonId });');
    expect(detail).not.toContain('navigation.setParams({ lessonId, searchTarget');
  });
});

