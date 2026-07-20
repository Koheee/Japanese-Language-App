import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const readTsx = (path: string) => {
  const source = readFileSync(path, 'utf8');
  return ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
};

const screen = readTsx(join(import.meta.dirname, 'LessonListScreen.tsx'));
const card = readTsx(join(import.meta.dirname, '..', 'components', 'LessonCard.tsx'));

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

const importPaths = (root: ts.SourceFile) =>
  root.statements
    .filter(ts.isImportDeclaration)
    .map((declaration) => (declaration.moduleSpecifier as ts.StringLiteral).text);

const visibleText = (root: ts.Node) =>
  collect(root, ts.isJsxText)
    .map((node) => node.text.trim())
    .filter(Boolean);

const textUsingStyle = (root: ts.Node, styleName: string) =>
  collect(root, ts.isJsxElement)
    .filter(({ openingElement }) => openingElement.attributes.properties.some((attribute) =>
      ts.isJsxAttribute(attribute)
      && attribute.name.getText() === 'style'
      && attribute.initializer !== undefined
      && ts.isJsxExpression(attribute.initializer)
      && attribute.initializer.expression?.getText() === `styles.${styleName}`))
    .map((element) => visibleText(element).join(' '));

describe('grammar reader lesson list', () => {
  it('presents the frozen curriculum totals instead of study activity', () => {
    expect(importPaths(screen)).not.toContain('../state/StudyContext');
    expect(importPaths(screen)).not.toContain('../data/lessons');

    const identifiers = collect(screen, ts.isIdentifier).map(({ text }) => text);
    expect(identifiers).not.toContain('useStudy');
    expect(identifiers).not.toContain('getProgress');
    expect(identifiers).not.toContain('dueCards');
    expect(identifiers).not.toContain('getLesson');

    expect(textUsingStyle(screen, 'summaryValue')).toEqual(['25', '101', 'A1–A2']);
    expect(textUsingStyle(screen, 'summaryLabel')).toEqual(['lessons', 'grammar points', 'reading path']);
    expect(visibleText(screen)).not.toEqual(expect.arrayContaining(['ready now', 'reviews due']));
  });

  it('renders LessonCard with only its lesson and navigation callback', () => {
    const lessonCards = collect(screen, (node): node is ts.JsxSelfClosingElement =>
      ts.isJsxSelfClosingElement(node) && node.tagName.getText(screen) === 'LessonCard');

    expect(lessonCards).toHaveLength(1);
    expect(lessonCards[0]!.attributes.properties.map((attribute) =>
      ts.isJsxAttribute(attribute) ? attribute.name.getText(screen) : 'spread'))
      .toEqual(['lesson', 'onPress']);
    const navigateCalls = collect(lessonCards[0]!, (node): node is ts.CallExpression =>
      ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && node.expression.expression.getText(screen) === 'navigation'
      && node.expression.name.text === 'navigate');
    expect(navigateCalls).toHaveLength(1);
    expect(navigateCalls[0]!.arguments[0]).toMatchObject({ text: 'LessonDetail' });
    const routeParams = navigateCalls[0]!.arguments[1]!;
    expect(ts.isObjectLiteralExpression(routeParams)).toBe(true);
    const lessonId = (routeParams as ts.ObjectLiteralExpression).properties.find((property): property is ts.PropertyAssignment =>
      ts.isPropertyAssignment(property) && property.name.getText(screen) === 'lessonId');
    expect(lessonId).toBeDefined();
    expect(ts.isPropertyAccessExpression(lessonId!.initializer)).toBe(true);
    expect((lessonId!.initializer as ts.PropertyAccessExpression).expression.getText(screen)).toBe('item');
    expect((lessonId!.initializer as ts.PropertyAccessExpression).name.text).toBe('id');
  });

  it('keeps LessonCard pressable while removing progress and preview branches', () => {
    expect(importPaths(card)).not.toContain('./ProgressBar');

    const component = card.statements.find((statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) && statement.name?.text === 'LessonCard');
    expect(component).toBeDefined();

    const parameter = component!.parameters[0]!;
    expect(ts.isObjectBindingPattern(parameter.name)).toBe(true);
    expect((parameter.name as ts.ObjectBindingPattern).elements.map((element) => element.name.getText(card)))
      .toEqual(['lesson', 'onPress']);
    expect(parameter.type && ts.isTypeLiteralNode(parameter.type)).toBe(true);
    expect((parameter.type as ts.TypeLiteralNode).members.map((member) => member.name?.getText(card)))
      .toEqual(['lesson', 'onPress']);

    const identifiers = collect(component!, ts.isIdentifier).map(({ text }) => text);
    expect(identifiers).not.toContain('progress');
    expect(visibleText(component!)).not.toEqual(expect.arrayContaining(['Ready to begin', 'CURRICULUM OUTLINE']));

    const lessonFields = collect(component!, ts.isPropertyAccessExpression)
      .filter((access) => access.expression.getText(card) === 'lesson')
      .map((access) => access.name.text);
    expect(lessonFields).toEqual(expect.arrayContaining([
      'availability',
      'number',
      'japaneseTitle',
      'title',
      'summary',
    ]));

    const pressable = collect(component!, (node): node is ts.JsxOpeningElement =>
      ts.isJsxOpeningElement(node) && node.tagName.getText(card) === 'Pressable');
    expect(pressable).toHaveLength(1);
    expect(pressable[0]!.attributes.properties.some((attribute) =>
      ts.isJsxAttribute(attribute) && attribute.name.getText(card) === 'onPress')).toBe(true);
  });
});
