import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const path = join(import.meta.dirname, 'LessonDetailScreen.tsx');
const source = readFileSync(path, 'utf8');
const screen = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const screenComponentPath = join(import.meta.dirname, '..', 'components', 'Screen.tsx');
const screenComponentSource = readFileSync(screenComponentPath, 'utf8');
const screenComponent = ts.createSourceFile(
  screenComponentPath,
  screenComponentSource,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

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

const styleObject = (name: string) => {
  const createCall = collect(screen, (node): node is ts.CallExpression =>
    ts.isCallExpression(node)
    && ts.isPropertyAccessExpression(node.expression)
    && node.expression.expression.getText(screen) === 'StyleSheet'
    && node.expression.name.text === 'create')[0];
  expect(createCall).toBeDefined();
  const stylesArgument = createCall?.arguments[0];
  if (stylesArgument === undefined || !ts.isObjectLiteralExpression(stylesArgument)) {
    throw new Error('StyleSheet.create must receive an object literal');
  }
  const style = stylesArgument.properties.find((property): property is ts.PropertyAssignment =>
    ts.isPropertyAssignment(property) && property.name.getText(screen) === name);
  expect(style).toBeDefined();
  if (style === undefined || !ts.isObjectLiteralExpression(style.initializer)) {
    throw new Error(`${name} must be an object-literal style`);
  }
  return style.initializer;
};

const styleProperty = (style: ts.ObjectLiteralExpression, name: string) => {
  const property = style.properties.find((candidate): candidate is ts.PropertyAssignment =>
    ts.isPropertyAssignment(candidate) && candidate.name.getText(screen) === name);
  expect(property).toBeDefined();
  return property!.initializer;
};

const activeTabBranch = (tab: 'grammar' | 'dialogue') => {
  const branches = collect(component!, ts.isConditionalExpression).filter((branch) =>
    branch.condition.getText(screen) === `activeTab === '${tab}'`);
  expect(branches).toHaveLength(1);
  return branches[0]!;
};

const mapCall = (root: ts.Node, collection: string) => {
  const maps = collect(root, ts.isCallExpression).filter((call) =>
    ts.isPropertyAccessExpression(call.expression)
    && call.expression.expression.getText(screen) === collection
    && call.expression.name.text === 'map');
  expect(maps).toHaveLength(1);
  return maps[0]!;
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

  it('forwards a live ScrollView ref through Screen', () => {
    const screenProps = screenComponent.statements.find((statement): statement is ts.InterfaceDeclaration =>
      ts.isInterfaceDeclaration(statement) && statement.name.text === 'ScreenProps');
    expect(screenProps).toBeDefined();
    const scrollRefMember = screenProps!.members.find((member): member is ts.PropertySignature =>
      ts.isPropertySignature(member) && member.name.getText(screenComponent) === 'scrollRef');
    expect(scrollRefMember?.type?.getText(screenComponent)).toBe('Ref<ScrollView>');

    const screenFunction = screenComponent.statements.find((statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) && statement.name?.text === 'Screen');
    expect(screenFunction).toBeDefined();
    const parameter = screenFunction!.parameters[0]!;
    expect(ts.isObjectBindingPattern(parameter.name)).toBe(true);
    expect((parameter.name as ts.ObjectBindingPattern).elements.map((element) =>
      element.name.getText(screenComponent))).toContain('scrollRef');

    const scrollView = collect(screenFunction!, (node): node is ts.JsxOpeningElement =>
      ts.isJsxOpeningElement(node) && node.tagName.getText(screenComponent) === 'ScrollView')[0]!;
    const refAttribute = scrollView.attributes.properties.find((attribute): attribute is ts.JsxAttribute =>
      ts.isJsxAttribute(attribute) && attribute.name.getText(screenComponent) === 'ref');
    expect(refAttribute?.initializer && ts.isJsxExpression(refAttribute.initializer)).toBe(true);
    expect((refAttribute!.initializer as ts.JsxExpression).expression?.getText(screenComponent))
      .toBe('scrollRef');

    const readerScreen = collect(component!, (node): node is ts.JsxOpeningElement =>
      ts.isJsxOpeningElement(node) && node.tagName.getText(screen) === 'Screen')[0]!;
    expect(expressionAttribute(readerScreen, 'scrollRef').getText(screen)).toBe('screenScrollRef');
  });

  it('switches grammar-map selections to Grammar and scrolls the shared Screen to the top', () => {
    const scrollRef = collect(component!, ts.isVariableDeclaration)
      .find((declaration) => declaration.name.getText(screen) === 'screenScrollRef');
    expect(scrollRef?.initializer?.getText(screen)).toBe('useRef<ScrollView>(null)');

    const handler = collect(component!, ts.isVariableDeclaration)
      .find((declaration) => declaration.name.getText(screen) === 'handleGrammarMapActivate');
    expect(handler?.initializer && ts.isArrowFunction(handler.initializer)).toBe(true);
    const handlerCalls = collect(handler!.initializer!, ts.isCallExpression);
    const tabCall = handlerCalls.find((call) => call.expression.getText(screen) === 'setActiveTab');
    expect(tabCall?.arguments[0]?.getText(screen)).toBe("'grammar'");
    const scrollCall = handlerCalls.find((call) => call.expression.getText(screen)
      === 'screenScrollRef.current?.scrollTo');
    expect(scrollCall).toBeDefined();
    expect(scrollCall!.arguments).toHaveLength(1);
    expect(scrollCall!.arguments[0]!.getText(screen)).toBe('{ y: 0, animated: true }');

    const grammarMap = collect(component!, ts.isCallExpression).find((call) =>
      ts.isPropertyAccessExpression(call.expression)
      && call.expression.expression.getText(screen) === 'lesson.grammar'
      && call.expression.name.text === 'map'
      && collect(call, (node): node is ts.JsxOpeningElement =>
        ts.isJsxOpeningElement(node) && node.tagName.getText(screen) === 'Pressable').length > 0)!;
    const grammarRow = collect(grammarMap, (node): node is ts.JsxOpeningElement =>
      ts.isJsxOpeningElement(node) && node.tagName.getText(screen) === 'Pressable')[0]!;
    expect(expressionAttribute(grammarRow, 'onPress').getText(screen))
      .toBe('handleGrammarMapActivate');
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
      .toBe('handleGrammarMapActivate');
    expect(expressionAttribute(grammarRow, 'onFocus').getText(screen))
      .toBe('() => setFocusedGrammarId(point.id)');
    expect(expressionAttribute(grammarRow, 'onBlur').getText(screen))
      .toBe('() => setFocusedGrammarId((current) => current === point.id ? null : current)');
    const grammarRowStyle = expressionAttribute(grammarRow, 'style');
    expect(ts.isArrayLiteralExpression(grammarRowStyle)).toBe(true);
    expect((grammarRowStyle as ts.ArrayLiteralExpression).elements.map((element) => element.getText(screen)))
      .toEqual([
        'styles.grammarMapRow',
        'focusedGrammarId === point.id && styles.grammarMapRowFocused',
      ]);

    const baseStyle = styleObject('grammarMapRow');
    const minHeight = styleProperty(baseStyle, 'minHeight');
    expect(ts.isNumericLiteral(minHeight)).toBe(true);
    expect(Number((minHeight as ts.NumericLiteral).text)).toBeGreaterThanOrEqual(44);
    const borderWidth = styleProperty(baseStyle, 'borderWidth');
    expect(ts.isNumericLiteral(borderWidth)).toBe(true);
    expect(Number((borderWidth as ts.NumericLiteral).text)).toBeGreaterThan(0);
    expect(styleProperty(styleObject('grammarMapRowFocused'), 'borderColor').getText(screen))
      .toBe('colors.gold');

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

  it('renders live Grammar and Dialogue collections in their matching branches', () => {
    const grammarMap = mapCall(activeTabBranch('grammar').whenTrue, 'lesson.grammar');
    const grammarCards = collect(grammarMap, (node): node is ts.JsxSelfClosingElement =>
      ts.isJsxSelfClosingElement(node) && node.tagName.getText(screen) === 'GrammarCard');
    expect(grammarCards).toHaveLength(1);
    expect(expressionAttribute(grammarCards[0]!, 'point').getText(screen)).toBe('point');
    expect(expressionAttribute(grammarCards[0]!, 'key').getText(screen)).toBe('point.id');

    const dialogueMap = mapCall(activeTabBranch('dialogue').whenTrue, 'lesson.dialogue');
    const dialogueBubbles = collect(dialogueMap, (node): node is ts.JsxSelfClosingElement =>
      ts.isJsxSelfClosingElement(node) && node.tagName.getText(screen) === 'DialogueBubble');
    expect(dialogueBubbles).toHaveLength(1);
    expect(expressionAttribute(dialogueBubbles[0]!, 'turn').getText(screen)).toBe('turn');
    expect(expressionAttribute(dialogueBubbles[0]!, 'key').getText(screen)).toBe('turn.id');
  });
});
