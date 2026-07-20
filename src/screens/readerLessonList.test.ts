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

type JsxElementWithAttributes = ts.JsxOpeningElement | ts.JsxSelfClosingElement;

const attributeNamed = (element: JsxElementWithAttributes, name: string) =>
  element.attributes.properties.find((attribute): attribute is ts.JsxAttribute =>
    ts.isJsxAttribute(attribute) && attribute.name.getText() === name);

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

const stringAttribute = (element: JsxElementWithAttributes, name: string) => {
  const attribute = attributeNamed(element, name);
  expect(attribute).toBeDefined();
  if (attribute?.initializer === undefined || !ts.isStringLiteral(attribute.initializer)) {
    throw new Error(`${name} must be a string literal`);
  }
  return attribute.initializer.text;
};

const expectIdentifierAttribute = (
  element: JsxElementWithAttributes,
  attributeName: string,
  identifier: string,
) => {
  const expression = expressionAttribute(element, attributeName);
  expect(ts.isIdentifier(expression)).toBe(true);
  expect((expression as ts.Identifier).text).toBe(identifier);
};

const styleObject = (root: ts.Node, name: string) => {
  const createCall = collect(root, (node): node is ts.CallExpression =>
    ts.isCallExpression(node)
    && ts.isPropertyAccessExpression(node.expression)
    && node.expression.expression.getText() === 'StyleSheet'
    && node.expression.name.text === 'create')[0];
  expect(createCall).toBeDefined();
  const stylesArgument = createCall?.arguments[0];
  expect(stylesArgument).toBeDefined();
  if (stylesArgument === undefined || !ts.isObjectLiteralExpression(stylesArgument)) {
    throw new Error('StyleSheet.create must receive an object literal');
  }

  const style = stylesArgument.properties.find(
    (property): property is ts.PropertyAssignment =>
      ts.isPropertyAssignment(property) && property.name.getText() === name,
  );
  expect(style).toBeDefined();
  if (style === undefined || !ts.isObjectLiteralExpression(style.initializer)) {
    throw new Error(`${name} must be an object-literal style`);
  }
  return style.initializer;
};

const styleProperty = (style: ts.ObjectLiteralExpression, name: string) => {
  const property = style.properties.find((candidate): candidate is ts.PropertyAssignment =>
    ts.isPropertyAssignment(candidate) && candidate.name.getText() === name);
  expect(property).toBeDefined();
  return property!.initializer;
};

const expectStaticListBindings = (root: ts.SourceFile) => {
  const flatLists = collect(root, (node): node is ts.JsxSelfClosingElement =>
    ts.isJsxSelfClosingElement(node) && node.tagName.getText(root) === 'FlatList');
  expect(flatLists).toHaveLength(1);
  expectIdentifierAttribute(flatLists[0]!, 'data', 'curriculum');

  const lessonCards = collect(root, (node): node is ts.JsxSelfClosingElement =>
    ts.isJsxSelfClosingElement(node) && node.tagName.getText(root) === 'LessonCard');
  expect(lessonCards).toHaveLength(1);
  expectIdentifierAttribute(lessonCards[0]!, 'lesson', 'item');
};

const expectCardAffordances = (root: ts.SourceFile) => {
  const component = root.statements.find((statement): statement is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(statement) && statement.name?.text === 'LessonCard');
  expect(component).toBeDefined();

  const returns = collect(component!, ts.isReturnStatement);
  expect(returns).toHaveLength(1);
  let returned = returns[0]!.expression!;
  while (ts.isParenthesizedExpression(returned)) returned = returned.expression;
  expect(ts.isJsxElement(returned)).toBe(true);
  const pressable = (returned as ts.JsxElement).openingElement;
  expect(pressable.tagName.getText(root)).toBe('Pressable');

  expectIdentifierAttribute(pressable, 'onPress', 'onPress');

  expect(stringAttribute(pressable, 'accessibilityRole')).toBe('button');

  expect(stringAttribute(pressable, 'accessibilityHint').trim()).not.toBe('');

  const labelExpression = expressionAttribute(pressable, 'accessibilityLabel');
  expect(ts.isTemplateExpression(labelExpression)).toBe(true);
  const labelFields = collect(labelExpression, ts.isPropertyAccessExpression)
    .filter((access) => ts.isIdentifier(access.expression) && access.expression.text === 'lesson')
    .map((access) => access.name.text);
  expect(labelFields).toEqual(expect.arrayContaining(['number', 'title']));

  const cardStyleExpression = expressionAttribute(pressable, 'style');
  const appliedStyles = collect(
    cardStyleExpression,
    ts.isPropertyAccessExpression,
  ).filter((access) => ts.isIdentifier(access.expression) && access.expression.text === 'styles')
    .map((access) => access.name.text);
  expect(appliedStyles).toContain('card');

  const chevrons = collect(returned, ts.isJsxElement).filter((element) => {
    const style = attributeNamed(element.openingElement, 'style');
    if (
      element.openingElement.tagName.getText(root) !== 'Text'
      || style?.initializer === undefined
      || !ts.isJsxExpression(style.initializer)
    ) {
      return false;
    }
    const expression = style.initializer.expression;
    return expression !== undefined
      && ts.isPropertyAccessExpression(expression)
      && ts.isIdentifier(expression.expression)
      && expression.expression.text === 'styles'
      && expression.name.text === 'chevron';
  });
  expect(chevrons).toHaveLength(1);
  expect(visibleText(chevrons[0]!)).toEqual(['\u203a']);

  const cardStyle = styleObject(root, 'card');
  expect(styleProperty(cardStyle, 'flexDirection')).toMatchObject({ text: 'row' });
  const padding = styleProperty(cardStyle, 'padding');
  expect(ts.isPropertyAccessExpression(padding)).toBe(true);
  expect(ts.isIdentifier((padding as ts.PropertyAccessExpression).expression)).toBe(true);
  expect(((padding as ts.PropertyAccessExpression).expression as ts.Identifier).text).toBe('spacing');
  expect((padding as ts.PropertyAccessExpression).name.text).toBe('lg');

  const numberStyle = styleObject(root, 'number');
  for (const dimension of ['width', 'height']) {
    const value = styleProperty(numberStyle, dimension);
    expect(ts.isNumericLiteral(value)).toBe(true);
    expect(Number((value as ts.NumericLiteral).text)).toBeGreaterThanOrEqual(44);
  }
};

describe('grammar reader lesson list', () => {
  it('adds all four safe-area insets to the FlatList base content spacing', () => {
    const safeAreaImport = screen.statements.find((statement): statement is ts.ImportDeclaration =>
      ts.isImportDeclaration(statement)
      && ts.isStringLiteral(statement.moduleSpecifier)
      && statement.moduleSpecifier.text === 'react-native-safe-area-context');
    expect(safeAreaImport).toBeDefined();
    expect(safeAreaImport?.importClause?.namedBindings && ts.isNamedImports(safeAreaImport.importClause.namedBindings))
      .toBe(true);
    expect((safeAreaImport!.importClause!.namedBindings as ts.NamedImports).elements
      .map((element) => element.name.text))
      .toContain('useSafeAreaInsets');

    const insetsDeclaration = collect(screen, ts.isVariableDeclaration)
      .find((declaration) => declaration.name.getText(screen) === 'insets');
    expect(insetsDeclaration?.initializer?.getText(screen)).toBe('useSafeAreaInsets()');

    const flatList = collect(screen, (node): node is ts.JsxSelfClosingElement =>
      ts.isJsxSelfClosingElement(node) && node.tagName.getText(screen) === 'FlatList')[0]!;
    const contentStyle = expressionAttribute(flatList, 'contentContainerStyle');
    expect(ts.isObjectLiteralExpression(contentStyle)).toBe(true);

    const padding = Object.fromEntries((contentStyle as ts.ObjectLiteralExpression).properties.map((property) => {
      expect(ts.isPropertyAssignment(property)).toBe(true);
      const assignment = property as ts.PropertyAssignment;
      return [assignment.name.getText(screen), assignment.initializer.getText(screen)];
    }));
    expect(padding).toEqual({
      paddingTop: '58 + insets.top',
      paddingBottom: 'spacing.huge + insets.bottom',
      paddingLeft: 'spacing.lg + insets.left',
      paddingRight: 'spacing.lg + insets.right',
    });

    expect(collect(screen, (node): node is ts.JsxOpeningElement | ts.JsxSelfClosingElement =>
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
      && node.tagName.getText(screen) === 'SafeAreaView')).toHaveLength(0);
  });

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
    expectStaticListBindings(screen);

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

  it('keeps LessonCard a large accessible pressable without progress or preview branches', () => {
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

    expectCardAffordances(card);
  });
});
