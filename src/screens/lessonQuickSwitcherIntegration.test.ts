import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const path = join(import.meta.dirname, 'LessonDetailScreen.tsx');
const source = readFileSync(path, 'utf8');
const screen = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

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

const component = screen.statements.find((statement): statement is ts.FunctionDeclaration =>
  ts.isFunctionDeclaration(statement) && statement.name?.text === 'LessonDetailScreen')!;

const handler = collect(component, ts.isVariableDeclaration)
  .find(({ name }) => name.getText(screen) === 'handleLessonSelect')!;

const switcher = collect(component, (node): node is ts.JsxSelfClosingElement =>
  ts.isJsxSelfClosingElement(node) && node.tagName.getText(screen) === 'LessonQuickSwitcher')[0]!;

const attributeNames = (element: ts.JsxSelfClosingElement) =>
  element.attributes.properties.map((attribute) =>
    ts.isJsxAttribute(attribute) ? attribute.name.getText(screen) : 'spread');

describe('LessonDetail lesson quick-switch integration', () => {
  it('renders the switcher from the lesson header for every detail section', () => {
    expect(source).toContain("import { LessonQuickSwitcher } from '../components/LessonQuickSwitcher';");
    expect(source).toContain("import { getLesson, lessons } from '../data/lessons';");
    expect(switcher).toBeDefined();
    expect(attributeNames(switcher)).toEqual(expect.arrayContaining([
      'currentLessonId',
      'focusOnMount',
      'lessons',
      'onMountFocusHandled',
      'onSelect',
    ]));
    expect(attributeNames(switcher)).not.toContain('disabled');
  });

  it('updates the current route parameter while preserving the active section', () => {
    const handlerCalls = collect(handler, ts.isCallExpression);
    const setParamsCalls = handlerCalls.filter((call) =>
      ts.isPropertyAccessExpression(call.expression)
      && call.expression.expression.getText(screen) === 'navigation'
      && call.expression.name.text === 'setParams');
    expect(setParamsCalls).toHaveLength(1);
    expect(setParamsCalls[0]!.arguments[0]?.getText(screen)).toBe('{ lessonId }');
    expect(handlerCalls.some((call) => call.expression.getText(screen) === 'setActiveTab')).toBe(false);
    expect(handlerCalls.some((call) =>
      ts.isPropertyAccessExpression(call.expression)
      && call.expression.expression.getText(screen) === 'navigation'
      && call.expression.name.text === 'navigate')).toBe(false);
  });

  it('hands focus to the newly mounted trigger after a real lesson switch', () => {
    expect(source).toContain('const lessonSwitcherFocusTargetRef = useRef<string | null>(null);');
    expect(handler.getText(screen)).toContain('lessonSwitcherFocusTargetRef.current = lessonId;');
    expect(switcher.getText(screen)).toContain('focusOnMount={lessonSwitcherFocusTargetRef.current === lesson.id}');
    expect(switcher.getText(screen)).toContain('onMountFocusHandled={() => {');
    expect(switcher.getText(screen)).toContain('lessonSwitcherFocusTargetRef.current = null;');
  });

  it('keys one scrolling reader screen by lesson so the selected section starts at the top', () => {
    const screens = collect(component, (node): node is ts.JsxOpeningElement =>
      ts.isJsxOpeningElement(node) && node.tagName.getText(screen) === 'Screen');
    expect(screens).toHaveLength(1);
    expect(screens[0]!.getText(screen)).toContain('key={lesson.id}');
    expect(screens[0]!.attributes.properties.some((attribute) =>
      ts.isJsxAttribute(attribute) && attribute.name.getText(screen) === 'scroll')).toBe(true);
  });
});
