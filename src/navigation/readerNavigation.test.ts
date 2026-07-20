import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const navigator = readFileSync(join(import.meta.dirname, 'AppNavigator.tsx'), 'utf8');
const app = readFileSync(join(import.meta.dirname, '..', '..', 'App.tsx'), 'utf8');

describe('grammar reader navigation', () => {
  it('registers only Lessons and LessonDetail', () => {
    expect(navigator).not.toContain('createBottomTabNavigator');
    expect(navigator).not.toContain('MainTabsNavigator');
    expect(navigator.match(/<LearnStack\.Screen/g)).toHaveLength(2);
    expect(navigator).toContain('name="Lessons"');
    expect(navigator).toContain('name="LessonDetail"');
  });

  it.each(['ExerciseScreen', 'ReviewScreen', 'ProgressScreen', 'VocabularyManagerScreen', 'WordEditorScreen', 'ImportPreviewScreen'])(
    'does not import or register %s',
    (screen) => expect(navigator).not.toContain(screen),
  );

  it('keeps study hydration mounted so stored data is not migrated or erased', () => {
    expect(app).toContain('<StudyProvider>');
    expect(app).toContain('<HydrationGate>');
  });
});
