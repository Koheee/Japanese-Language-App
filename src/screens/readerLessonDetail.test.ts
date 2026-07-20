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

type JsxElementWithAttributes = ts.JsxOpeningElement | ts.JsxSelfClosingElement;

const attributeNamed = (element: JsxElementWithAttributes, name: string) =>
  element.attributes.properties.find((attribute): attribute is ts.JsxAttribute =>
    ts.isJsxAttribute(attribute) && attribute.name.getText(screen) === name);

const stringAttribute = (element: JsxElementWithAttributes, name: string) => {
  const attribute = attributeNamed(element, name);
  expect(attribute).toBeDefined();
  if (attribute?.initializer === undefined || !ts.isStringLiteral(attribute.initializer)) {
    throw new Error(`${name} must be a string literal`);
  }
  return attribute.initializer.text;
};

const expressionAttribute = (element: JsxElementWithAttributes, name: string) => {
  const attribute = attributeNamed(element, name);
  expect(attribute).toBeDefined();
  if (
    attribute?.initializer === undefined
    || !ts.isJsxExpression(attribute.initializer)
    || attribute.initializer.expression === undefined
  ) {
    throw new Error(`${name} must be a JSX expression`);
  }
  return attribute.initializer.expression;
};

const component = screen.statements.find((statement): statement is ts.FunctionDeclaration =>
  ts.isFunctionDeclaration(statement) && statement.name?.text === 'LessonDetailScreen');

describe('grammar reader lesson detail', () => {
  it('defines exactly Overview, Grammar, and Dialogue as its sections', () => {
    const propsType = screen.statements.find((statement): statement is ts.TypeAliasDeclaration =>
      ts.isTypeAliasDeclaration(statement) && statement.name.text === 'Props');
    expect(propsType?.type.getText(screen))
      .toBe("NativeStackScreenProps<LearnStackParamList, 'LessonDetail'>");

    const tabType = screen.statements.find((statement): statement is ts.TypeAliasDeclaration =>
      ts.isTypeAliasDeclaration(statement) && statement.name.text === 'Tab');
    expect(tabType).toBeDefined();
    expect(ts.isUnionTypeNode(tabType!.type)).toBe(true);
    expect((tabType!.type as ts.UnionTypeNode).types.map((type) =>
      ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal) ? type.literal.text : null))
      .toEqual(['overview', 'grammar', 'dialogue']);

    const tabsDeclaration = collect(screen, ts.isVariableDeclaration)
      .find(({ name }) => name.getText(screen) === 'tabs');
    expect(tabsDeclaration).toBeDefined();
    expect(ts.isArrayLiteralExpression(tabsDeclaration!.initializer!)).toBe(true);
    const tabItems = (tabsDeclaration!.initializer as ts.ArrayLiteralExpression).elements.map((element) => {
      expect(ts.isObjectLiteralExpression(element)).toBe(true);
      const properties = (element as ts.ObjectLiteralExpression).properties;
      return Object.fromEntries(properties.map((property) => {
        expect(ts.isPropertyAssignment(property)).toBe(true);
        const assignment = property as ts.PropertyAssignment;
        expect(ts.isStringLiteral(assignment.initializer)).toBe(true);
        return [assignment.name.getText(screen), (assignment.initializer as ts.StringLiteral).text];
      }));
    });
    expect(tabItems).toEqual([
      { id: 'overview', label: 'Overview' },
      { id: 'grammar', label: 'Grammar' },
      { id: 'dialogue', label: 'Dialogue' },
    ]);
  });

  it('keeps study, vocabulary, progress, and exercise UI out of the reader screen', () => {
    const imports = screen.statements
      .filter(ts.isImportDeclaration)
      .map((declaration) => (declaration.moduleSpecifier as ts.StringLiteral).text);
    for (const removedImport of [
      '@react-navigation/bottom-tabs',
      '@react-navigation/native',
      '../components/CompositionAwareTextInput',
      '../components/PrimaryButton',
      '../components/ProgressBar',
      '../data/curriculum',
      '../state/StudyContext',
      './lessonWordsModel',
      './routeUiLifecycle',
      './useRouteUiLifecycle',
    ]) expect(imports).not.toContain(removedImport);

    const identifiers = collect(component!, ts.isIdentifier).map(({ text }) => text);
    for (const removedIdentifier of [
      'beginPractice',
      'practiceFooter',
      'VocabularyManager',
      'wordsView',
      'isStarting',
      'completion',
    ]) expect(identifiers).not.toContain(removedIdentifier);

    const lessonFields = collect(component!, ts.isPropertyAccessExpression)
      .filter((access) => access.expression.getText(screen) === 'lesson')
      .map((access) => access.name.text);
    expect(lessonFields).not.toContain('vocabulary');
    expect(lessonFields).not.toContain('exercises');

    const navigationTargets = collect(component!, ts.isCallExpression)
      .filter((call) => ts.isPropertyAccessExpression(call.expression)
      && call.expression.expression.getText(screen) === 'navigation'
      && call.expression.name.text === 'navigate')
      .map((call) => call.arguments[0])
      .filter((argument): argument is ts.StringLiteral =>
        argument !== undefined && ts.isStringLiteral(argument))
      .map(({ text }) => text);
    expect(navigationTargets).not.toContain('Exercise');
    expect(navigationTargets).not.toContain('VocabularyManager');
  });

  it('uses one keyed scrolling screen and returns null only for an unknown lesson', () => {
    const screens = collect(component!, (node): node is ts.JsxOpeningElement =>
      ts.isJsxOpeningElement(node) && node.tagName.getText(screen) === 'Screen');
    expect(screens).toHaveLength(1);
    expect(expressionAttribute(screens[0]!, 'key').getText(screen)).toBe('lesson.id');
    expect(attributeNamed(screens[0]!, 'scroll')).toBeDefined();

    const nullGuards = collect(component!, ts.isIfStatement).filter((statement) => {
      if (!ts.isPrefixUnaryExpression(statement.expression)
        || statement.expression.operator !== ts.SyntaxKind.ExclamationToken
        || statement.expression.operand.getText(screen) !== 'lesson') return false;
      return collect(statement.thenStatement, ts.isReturnStatement)
        .some((returnStatement) => returnStatement.expression?.kind === ts.SyntaxKind.NullKeyword);
    });
    expect(nullGuards).toHaveLength(1);
  });

  it('builds Overview from goals, the central mental shift, a grammar map, and static context', () => {
    expect(source).toContain('lesson.goals.map');
    expect(source).toContain('lesson.grammar[0]?.whyItWorks');

    const grammarMap = collect(component!, ts.isCallExpression).find((call) =>
      ts.isPropertyAccessExpression(call.expression)
      && call.expression.expression.getText(screen) === 'lesson.grammar'
      && call.expression.name.text === 'map'
      && collect(call, (node): node is ts.JsxOpeningElement =>
        ts.isJsxOpeningElement(node) && node.tagName.getText(screen) === 'Pressable').length > 0);
    expect(grammarMap).toBeDefined();

    const grammarRow = collect(grammarMap!, (node): node is ts.JsxOpeningElement =>
      ts.isJsxOpeningElement(node) && node.tagName.getText(screen) === 'Pressable')[0]!;
    expect(stringAttribute(grammarRow, 'accessibilityRole')).toBe('button');
    expect(expressionAttribute(grammarRow, 'accessibilityLabel').getText(screen))
      .toContain('Open grammar');
    expect(expressionAttribute(grammarRow, 'onPress').getText(screen))
      .toContain("setActiveTab('grammar')");
    const grammarMapFields = collect(grammarMap!, ts.isPropertyAccessExpression)
      .filter((access) => access.expression.getText(screen) === 'point')
      .map((access) => access.name.text);
    expect(grammarMapFields).toEqual(expect.arrayContaining(['title', 'pattern', 'plainEnglish']));

    const stats = collect(component!, (node): node is ts.JsxSelfClosingElement =>
      ts.isJsxSelfClosingElement(node) && node.tagName.getText(screen) === 'Stat');
    expect(stats).toHaveLength(3);
    expect(stats.map((stat) => stringAttribute(stat, 'label')))
      .toEqual(['patterns', 'dialogue lines', 'scenario']);
    expect(stats.map((stat) => expressionAttribute(stat, 'value').getText(screen)))
      .toEqual(['lesson.grammar.length', 'lesson.dialogue.length', 'lesson.theme']);
  });
});
