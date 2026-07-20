import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => existsSync(path) ? readFileSync(path, 'utf8') : '';
const componentPath = join(import.meta.dirname, 'DialogueGrammarNotes.tsx');
const bubblePath = join(import.meta.dirname, 'DialogueBubble.tsx');
const screenPath = join(import.meta.dirname, '..', 'screens', 'LessonDetailScreen.tsx');
const componentSource = readSource(componentPath);
const bubbleSource = readSource(bubblePath);
const screenSource = readSource(screenPath);
const componentTree = ts.createSourceFile(
  componentPath,
  componentSource,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const bubbleTree = ts.createSourceFile(
  bubblePath,
  bubbleSource,
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

describe('dialogue grammar-note accessibility and behavior', () => {
  it('renders no note container when the projection is empty', () => {
    expect(componentSource).toContain('if (items.length === 0) return null;');
  });

  it('renders pattern-labelled buttons with complete state and touch semantics', () => {
    const itemsMap = collect(componentTree, ts.isCallExpression).find(
      (call) => call.expression.getText(componentTree) === 'items.map',
    );
    expect(itemsMap).toBeDefined();
    const button = collect(itemsMap!, ts.isJsxOpeningElement).find(
      (element) => element.tagName.getText(componentTree) === 'Pressable',
    );
    expect(button).toBeDefined();
    expect(attributeText(button!, 'accessibilityRole')).toBe('button');
    expect(attributeExpression(button!, 'accessibilityLabel')).toBe('item.accessibilityLabel');
    expect(attributeExpression(button!, 'accessibilityState')).toBe(
      '{ selected: activeGrammarId === item.grammarId, expanded: activeGrammarId === item.grammarId }',
    );
    expect(attributeExpression(button!, 'aria-selected')).toBe('activeGrammarId === item.grammarId');
    expect(attributeExpression(button!, 'aria-expanded')).toBe('activeGrammarId === item.grammarId');

    const visiblePattern = collect(itemsMap!, ts.isJsxExpression).some(
      (expression) => expression.expression?.getText(componentTree) === 'item.pattern',
    );
    expect(visiblePattern).toBe(true);
  });

  it('keeps fixed 44-point geometry and gives keyboard focus a high-contrast border', () => {
    const base = styleProperties(styleObject('noteButton'));
    const focused = styleProperties(styleObject('noteButtonFocused'));
    expect(Number(base.get('minHeight'))).toBeGreaterThanOrEqual(44);
    expect(Number(base.get('borderWidth'))).toBeGreaterThan(0);
    expect(base.get('borderColor')).toBe("'transparent'");
    expect(focused.get('borderColor')).toBe('colors.forest');
    expect(focused.has('borderWidth')).toBe(false);
    expect(componentSource).toContain('focusedGrammarId === item.grammarId && styles.noteButtonFocused');
  });

  it('uses one active ID to toggle or replace the expanded contextual explanation', () => {
    expect(componentSource).toContain('const [activeGrammarId, setActiveGrammarId] = useState<string | null>(null);');
    expect(componentSource).toContain(
      'setActiveGrammarId((current) => toggleDialogueGrammarNote(current, item.grammarId))',
    );

    const activeCondition = collect(componentTree, ts.isConditionalExpression).find(
      (condition) => condition.condition.getText(componentTree)
        === 'activeGrammarId === item.grammarId'
        && collect(condition.whenTrue, ts.isPropertyAccessExpression)
          .some((access) => access.getText(componentTree) === 'item.title'),
    );
    expect(activeCondition).toBeDefined();
    expect(collect(activeCondition!.whenTrue, ts.isPropertyAccessExpression)
      .some((access) => access.getText(componentTree) === 'item.title')).toBe(true);
    expect(collect(activeCondition!.whenTrue, ts.isPropertyAccessExpression)
      .some((access) => access.getText(componentTree) === 'item.explanation')).toBe(true);
  });

  it('contains no external-link or romaji path', () => {
    expect(componentSource).not.toContain('Linking');
    expect(componentSource).not.toContain('openURL');
    expect(componentSource.toLowerCase()).not.toContain('romaji');
  });
});

describe('dialogue grammar-note integration', () => {
  it('places the note component after the English line inside every bubble', () => {
    const notes = collect(bubbleTree, (node): node is ts.JsxSelfClosingElement =>
      ts.isJsxSelfClosingElement(node)
      && node.tagName.getText(bubbleTree) === 'DialogueGrammarNotes');
    expect(notes).toHaveLength(1);
    expect(attributeExpression(notes[0]!, 'turn')).toBe('turn');
    expect(attributeExpression(notes[0]!, 'grammar')).toBe('grammar');

    const english = collect(bubbleTree, ts.isJsxElement).find(
      (element) => element.openingElement.tagName.getText(bubbleTree) === 'Text'
        && attributeExpression(element.openingElement, 'style') === 'styles.english',
    );
    expect(english).toBeDefined();
    expect(english!.end).toBeLessThan(notes[0]!.pos);
    expect(bubbleSource).toContain('grammar: readonly GrammarPoint[];');
  });

  it('passes the current lesson grammar inventory to every dialogue bubble', () => {
    const dialogueMap = collect(screenTree, ts.isCallExpression).find(
      (call) => call.expression.getText(screenTree) === 'lesson.dialogue.map',
    );
    expect(dialogueMap).toBeDefined();
    const bubbles = collect(dialogueMap!, (node): node is ts.JsxSelfClosingElement =>
      ts.isJsxSelfClosingElement(node) && node.tagName.getText(screenTree) === 'DialogueBubble');
    expect(bubbles).toHaveLength(1);
    expect(attributeExpression(bubbles[0]!, 'grammar')).toBe('lesson.grammar');
    expect(attributeExpression(bubbles[0]!, 'turn')).toBe('turn');
    expect(attributeExpression(bubbles[0]!, 'alignRight')).toBe('index % 2 === 1');
  });
});
