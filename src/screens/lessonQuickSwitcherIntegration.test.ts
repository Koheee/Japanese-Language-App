import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const source = readFileSync(join(import.meta.dirname, 'LessonDetailScreen.tsx'), 'utf8');

describe('LessonDetail lesson quick-switch integration', () => {
  it('renders the switcher from the lesson header for every detail section', () => {
    const header = source.match(/const lessonHeader = \([\s\S]*?\n  \);/)?.[0] ?? '';

    expect(source).toContain("import { LessonQuickSwitcher } from '../components/LessonQuickSwitcher';");
    expect(source).toContain("import { getLesson, lessons } from '../data/lessons';");
    expect(header).toContain('<LessonQuickSwitcher');
    expect(header).toContain('currentLessonId={lesson.id}');
    expect(header).toContain('disabled={isStarting}');
    expect(header).toContain('lessons={lessons}');
    expect(header).toContain('onSelect={handleLessonSelect}');
  });

  it('changes the current route parameter without stacking another lesson route', () => {
    const handler = source.match(/const handleLessonSelect = \(lessonId: string\) => \{[\s\S]*?\n  \};/)?.[0] ?? '';

    expect(handler).toContain("setDraftQuery('');");
    expect(handler).toContain("setCommittedQuery('');");
    expect(handler).toContain('navigation.setParams({ lessonId });');
    expect(handler).not.toContain('setActiveTab');
    expect(handler).not.toContain("navigate('LessonDetail'");
  });

  it('hands focus to the newly mounted trigger after a real lesson switch', () => {
    const handler = source.match(/const handleLessonSelect = \(lessonId: string\) => \{[\s\S]*?\n  \};/)?.[0] ?? '';
    const header = source.match(/const lessonHeader = \([\s\S]*?\n  \);/)?.[0] ?? '';

    expect(source).toContain('const lessonSwitcherFocusTargetRef = useRef<string | null>(null);');
    expect(handler).toContain('lessonSwitcherFocusTargetRef.current = lessonId;');
    expect(header).toContain('focusOnMount={lessonSwitcherFocusTargetRef.current === lesson.id}');
    expect(header).toContain('onMountFocusHandled={() => {');
    expect(header).toContain('lessonSwitcherFocusTargetRef.current = null;');
  });

  it('keys both scroll containers by lesson so the selected section starts at the top', () => {
    expect(source.match(/<Screen\s+key=\{lesson\.id\}/g)).toHaveLength(2);
  });
});
