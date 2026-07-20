import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const readScreen = (file: string) => readFileSync(join(import.meta.dirname, file), 'utf8');

const collect = <T extends ts.Node>(
  root: ts.Node,
  predicate: (node: ts.Node) => node is T,
): T[] => {
  const matches: T[] = [];
  const visit = (node: ts.Node) => {
    if (predicate(node)) matches.push(node);
    ts.forEachChild(node, visit);
  };
  visit(root);
  return matches;
};

describe('review screen accessibility contracts', () => {
  const source = readScreen('ReviewScreen.tsx');

  it('exposes the review reveal card as a state-aware button', () => {
    const revealTag = source.match(
      /<Pressable[\s\S]*?style=\{\[styles\.card,[\s\S]*?\}\s*>/,
    )?.[0] ?? '';

    expect(revealTag).toContain('accessibilityRole="button"');
    expect(revealTag).toContain('accessibilityLabel={revealed');
    expect(revealTag).toContain('accessibilityHint={revealed');
    expect(revealTag).toContain('accessibilityState={{ expanded: revealed }}');
    expect(revealTag).toContain('aria-expanded={revealed}');
  });

  it('gives every grading action a button role and names its resulting interval', () => {
    const ratingTag = source.match(
      /\{ratings\.map\([\s\S]*?<Pressable[\s\S]*?style=\{\[styles\.ratingButton,[\s\S]*?\}\s*>/,
    )?.[0] ?? '';

    expect(ratingTag).toContain('accessibilityRole="button"');
    expect(ratingTag).toContain(
      'accessibilityLabel={`${rating.label}, next review ${formatInterval(rating.id, card)}`}',
    );
    expect(ratingTag).toContain('accessibilityHint="Schedules this card using the selected recall rating"');
  });
});

describe('route-local tab accessibility contracts', () => {
  it('forwards selected and focus state for all three lesson detail tabs', () => {
    const source = readScreen('LessonDetailScreen.tsx');
    const screen = ts.createSourceFile(
      'LessonDetailScreen.tsx',
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const tabsMap = collect(screen, ts.isCallExpression).find((call) =>
      ts.isPropertyAccessExpression(call.expression)
      && call.expression.expression.getText(screen) === 'tabs'
      && call.expression.name.text === 'map');
    expect(tabsMap).toBeDefined();
    const tabTag = collect(tabsMap!, (node): node is ts.JsxOpeningElement =>
      ts.isJsxOpeningElement(node) && node.tagName.getText(screen) === 'Pressable')[0]
      ?.getText(screen) ?? '';

    const tabType = screen.statements.find((statement): statement is ts.TypeAliasDeclaration =>
      ts.isTypeAliasDeclaration(statement) && statement.name.text === 'Tab');
    expect(tabType?.type.getText(screen)).toBe("'overview' | 'grammar' | 'dialogue'");
    expect(tabTag).toContain('accessibilityRole="tab"');
    expect(tabTag).toContain('accessibilityState={{ selected: activeTab === tab.id }}');
    expect(tabTag).toContain('aria-selected={activeTab === tab.id}');
    expect(tabTag).toContain('onFocus={() => setFocusedTab(tab.id)}');
    expect(tabTag).toContain("onBlur={() => setFocusedTab((current) => current === tab.id ? null : current)}");
    expect(tabTag).toContain('focusedTab === tab.id && styles.tabFocused');
  });

  it('forwards selected state for both vocabulary manager tabs on web and native', () => {
    const source = readScreen('VocabularyManagerScreen.tsx');

    expect(source).toContain("accessibilityState={{ selected: ui.view === 'active' }}");
    expect(source).toContain("aria-selected={ui.view === 'active'}");
    expect(source).toContain("accessibilityState={{ selected: ui.view === 'hidden' }}");
    expect(source).toContain("aria-selected={ui.view === 'hidden'}");
  });
});
