import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => existsSync(path) ? readFileSync(path, 'utf8') : '';
const componentPath = join(import.meta.dirname, 'LessonReferenceSection.tsx');
const screenPath = join(import.meta.dirname, '..', 'screens', 'LessonDetailScreen.tsx');
const grammarCardPath = join(import.meta.dirname, 'GrammarCard.tsx');
const componentSource = readSource(componentPath);
const screenSource = readSource(screenPath);
const grammarCardSource = readSource(grammarCardPath);
const componentTree = ts.createSourceFile(
  componentPath,
  componentSource,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const screenTree = ts.createSourceFile(
  screenPath,
  screenSource,
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

type JsxTag = ts.JsxOpeningElement | ts.JsxSelfClosingElement;

const attribute = (element: JsxTag, name: string) => element.attributes.properties.find(
  (candidate): candidate is ts.JsxAttribute => ts.isJsxAttribute(candidate)
    && candidate.name.getText(element.getSourceFile()) === name,
);

const attributeText = (element: JsxTag, name: string) => {
  const initializer = attribute(element, name)?.initializer;
  return initializer && ts.isStringLiteral(initializer) ? initializer.text : null;
};

const attributeExpression = (element: JsxTag, name: string) => {
  const initializer = attribute(element, name)?.initializer;
  return initializer && ts.isJsxExpression(initializer) && initializer.expression
    ? initializer.expression.getText(element.getSourceFile())
    : null;
};

const styleObject = (name: string) => {
  const createCall = collect(componentTree, ts.isCallExpression).find(
    (call) => call.expression.getText(componentTree) === 'StyleSheet.create',
  );
  const definitions = createCall?.arguments[0];
  expect(definitions && ts.isObjectLiteralExpression(definitions)).toBe(true);
  const style = (definitions as ts.ObjectLiteralExpression).properties.find(
    (candidate): candidate is ts.PropertyAssignment => ts.isPropertyAssignment(candidate)
      && candidate.name.getText(componentTree) === name,
  );
  expect(style && ts.isObjectLiteralExpression(style.initializer)).toBe(true);
  return style!.initializer as ts.ObjectLiteralExpression;
};

const styleProperties = (style: ts.ObjectLiteralExpression) => new Map(
  style.properties.filter(ts.isPropertyAssignment).map((property) => [
    property.name.getText(componentTree),
    property.initializer.getText(componentTree),
  ]),
);

describe('optional lesson-reference accessibility', () => {
  it('starts collapsed and forwards native and web expansion semantics', () => {
    const toggle = collect(componentTree, ts.isJsxOpeningElement).find(
      (element) => element.tagName.getText(componentTree) === 'Pressable'
        && attributeText(element, 'accessibilityLabel') === 'Optional references for this lesson',
    );
    expect(toggle).toBeDefined();
    expect(attributeText(toggle!, 'accessibilityRole')).toBe('button');
    expect(attributeExpression(toggle!, 'accessibilityState')).toBe('{ expanded }');
    expect(attributeExpression(toggle!, 'aria-expanded')).toBe('expanded');
    expect(componentSource).toContain('const [expanded, setExpanded] = useState(false);');
  });

  it('explains that the internal lesson is complete and links were editorial cross-checks', () => {
    expect(componentSource).toContain('This lesson is complete without opening these links.');
    expect(componentSource).toContain('These references were used only for editorial cross-checking.');
  });

  it('renders descriptive, focus-visible external links with fixed 44-point geometry', () => {
    const itemsMap = collect(componentTree, ts.isCallExpression).find(
      (call) => call.expression.getText(componentTree) === 'items.map',
    );
    expect(itemsMap).toBeDefined();
    const link = collect(itemsMap!, ts.isJsxOpeningElement).find(
      (element) => element.tagName.getText(componentTree) === 'Pressable',
    );
    expect(link).toBeDefined();
    expect(attributeText(link!, 'accessibilityRole')).toBe('link');
    expect(attributeExpression(link!, 'accessibilityLabel')).toBe('item.accessibilityLabel');
    expect(attributeExpression(link!, 'onFocus')).toBe('() => setFocusedReferenceUrl(item.url)');
    expect(attributeExpression(link!, 'style')).toContain('focusedReferenceUrl === item.url');

    const base = styleProperties(styleObject('link'));
    const focused = styleProperties(styleObject('linkFocused'));
    expect(Number(base.get('minHeight'))).toBeGreaterThanOrEqual(44);
    expect(Number(base.get('borderWidth'))).toBeGreaterThan(0);
    expect(base.get('borderColor')).toBe("'transparent'");
    expect(focused.get('borderColor')).toBe('colors.forest');
    expect(focused.has('borderWidth')).toBe(false);
  });

  it('announces link failures inline and drops stale or post-unmount results', () => {
    const alert = collect(componentTree, ts.isJsxOpeningElement).find(
      (element) => element.tagName.getText(componentTree) === 'Text'
        && attributeText(element, 'accessibilityRole') === 'alert',
    );
    expect(alert).toBeDefined();
    expect(attributeText(alert!, 'accessibilityLiveRegion')).toBe('assertive');
    expect(attributeText(alert!, 'aria-live')).toBe('assertive');
    expect(componentSource).toContain('createLatestLessonReferenceAttemptCoordinator()');
    expect(componentSource).toContain('referenceAttemptCoordinator.open(url, openUrl, setReferenceError)');
    expect(componentSource).toContain('return () => referenceAttemptCoordinator.deactivate();');
  });

  it('renders nothing for an empty reference projection', () => {
    expect(componentSource).toContain('if (items.length === 0) return null;');
  });
});

describe('lesson-reference integration', () => {
  it('renders exactly once after all cards in Grammar and nowhere inside a card', () => {
    const detail = screenTree.statements.find(
      (statement): statement is ts.FunctionDeclaration => ts.isFunctionDeclaration(statement)
        && statement.name?.text === 'LessonDetailScreen',
    );
    expect(detail).toBeDefined();
    const references = collect(detail!, (node): node is ts.JsxSelfClosingElement =>
      ts.isJsxSelfClosingElement(node) && node.tagName.getText(screenTree) === 'LessonReferenceSection');
    expect(references).toHaveLength(1);
    expect(attributeExpression(references[0]!, 'points')).toBe('lesson.grammar');

    const grammarBranch = collect(detail!, ts.isConditionalExpression).find(
      (branch) => branch.condition.getText(screenTree) === "activeTab === 'grammar'",
    );
    expect(grammarBranch).toBeDefined();
    expect(collect(grammarBranch!.whenTrue, (node): node is ts.JsxSelfClosingElement =>
      ts.isJsxSelfClosingElement(node) && node.tagName.getText(screenTree) === 'LessonReferenceSection'))
      .toHaveLength(1);

    const grammarMap = collect(grammarBranch!.whenTrue, ts.isCallExpression).find(
      (call) => call.expression.getText(screenTree) === 'lesson.grammar.map',
    );
    expect(grammarMap).toBeDefined();
    expect(grammarMap!.end).toBeLessThan(references[0]!.pos);
    expect(grammarCardSource).not.toContain('LessonReferenceSection');
    expect(grammarCardSource).not.toContain('furtherReading');
  });
});
