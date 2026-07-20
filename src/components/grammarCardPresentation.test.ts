import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import type { GrammarPoint } from '../models/content';
import * as grammarCardPresentation from './grammarCardPresentation';

type GrammarCardPresentationApi = typeof import('./grammarCardPresentation') & {
  createGrammarCardState: () => {
    insightExpanded: boolean;
    deeperExpanded: boolean;
    focusedToggle: 'insight' | 'deeper' | null;
  };
  projectGrammarCard: (
    point: GrammarPoint,
    state: ReturnType<GrammarCardPresentationApi['createGrammarCardState']>,
  ) => Record<string, unknown>;
  setGrammarCardToggleFocused: (
    state: ReturnType<GrammarCardPresentationApi['createGrammarCardState']>,
    section: 'insight' | 'deeper',
    focused: boolean,
  ) => ReturnType<GrammarCardPresentationApi['createGrammarCardState']>;
  toggleGrammarCardSection: (
    state: ReturnType<GrammarCardPresentationApi['createGrammarCardState']>,
    section: 'insight' | 'deeper',
  ) => ReturnType<GrammarCardPresentationApi['createGrammarCardState']>;
};

const getPresentationApi = (): GrammarCardPresentationApi => {
  const candidate = grammarCardPresentation as Record<string, unknown>;
  for (const name of [
    'createGrammarCardState',
    'projectGrammarCard',
    'setGrammarCardToggleFocused',
    'toggleGrammarCardSection',
  ]) {
    expect(candidate[name], `${name} should be exported`).toBeTypeOf('function');
  }
  return grammarCardPresentation as GrammarCardPresentationApi;
};

const point: GrammarPoint = {
  id: 'l1-topic-copula',
  title: 'Make a noun the topic, then identify it',
  pattern: 'A は B です',
  plainEnglish: '“As for A, it is B.”',
  explanation: 'Put the shared topic before は and the identifying noun before です to close the noun sentence politely.',
  whyItWorks: 'Japanese establishes a conversational frame before supplying the comment, so understood material can remain unspoken.',
  usageBoundary: 'Do not replace every English subject with は; this particle marks the chosen conversational topic.',
  formation: [{
    label: 'Polite noun sentence',
    formula: 'topic + は + identity/category + です',
    explanation: 'Choose the topic first, then close the identifying noun phrase politely with です.',
  }],
  contrast: {
    with: 'は compared with が',
    explanation: 'Use は to establish the conversational topic; が has a separate identifying role.',
  },
  notes: ['Literal frame: “As for A, B.”'],
  beyondBasics: ['A topic can stay understood across nearby sentences.'],
  examples: [
    { japanese: 'わたしは 学生です。', reading: 'わたしは がくせいです。', english: 'I am a student.' },
    { japanese: 'エマさんは 研究者です。', reading: 'エマさんは けんきゅうしゃです。', english: 'Emma is a researcher.' },
  ],
  furtherReading: [{
    title: "Tae Kim's Guide: Introduction to Particles",
    url: 'https://guidetojapanese.org/learn/grammar/particlesintro',
  }],
};

describe('grammar card presentation', () => {
  it('starts with two collapsed, accessible 44-point toggles', () => {
    const { createGrammarCardState, projectGrammarCard } = getPresentationApi();
    expect(projectGrammarCard(point, createGrammarCardState())).toMatchObject({
      insightToggle: {
        accessibilityRole: 'button',
        accessibilityState: { expanded: false },
        minimumTouchTarget: 44,
      },
      deeperToggle: {
        accessibilityRole: 'button',
        accessibilityState: { expanded: false },
        minimumTouchTarget: 44,
      },
      insight: null,
      deeper: null,
    });
  });

  it('toggles the two sections independently without mutating earlier states', () => {
    const { createGrammarCardState, toggleGrammarCardSection } = getPresentationApi();
    const initial = createGrammarCardState();
    const insightOpen = toggleGrammarCardSection(initial, 'insight');
    const bothOpen = toggleGrammarCardSection(insightOpen, 'deeper');
    const deeperOnly = toggleGrammarCardSection(bothOpen, 'insight');

    expect(initial).toEqual({
      insightExpanded: false,
      deeperExpanded: false,
      focusedToggle: null,
    });
    expect(insightOpen).toMatchObject({ insightExpanded: true, deeperExpanded: false });
    expect(bothOpen).toMatchObject({ insightExpanded: true, deeperExpanded: true });
    expect(deeperOnly).toMatchObject({ insightExpanded: false, deeperExpanded: true });
  });

  it('tracks one focused toggle without collapsing either section', () => {
    const {
      createGrammarCardState,
      setGrammarCardToggleFocused,
      toggleGrammarCardSection,
    } = getPresentationApi();
    const open = toggleGrammarCardSection(
      toggleGrammarCardSection(createGrammarCardState(), 'insight'),
      'deeper',
    );
    const insightFocused = setGrammarCardToggleFocused(open, 'insight', true);
    const deeperFocused = setGrammarCardToggleFocused(insightFocused, 'deeper', true);
    const staleInsightBlur = setGrammarCardToggleFocused(deeperFocused, 'insight', false);
    const noFocus = setGrammarCardToggleFocused(staleInsightBlur, 'deeper', false);

    expect(insightFocused.focusedToggle).toBe('insight');
    expect(deeperFocused.focusedToggle).toBe('deeper');
    expect(staleInsightBlur.focusedToggle).toBe('deeper');
    expect(noFocus).toEqual({
      insightExpanded: true,
      deeperExpanded: true,
      focusedToggle: null,
    });
  });

  it('projects internal teaching only and leaves references out of the card model', () => {
    const { createGrammarCardState, projectGrammarCard, toggleGrammarCardSection } = getPresentationApi();
    const expanded = toggleGrammarCardSection(
      toggleGrammarCardSection(createGrammarCardState(), 'insight'),
      'deeper',
    );
    const projection = projectGrammarCard(point, expanded);

    expect(projection.insight).toEqual({
      whyItWorks: point.whyItWorks,
      usageBoundary: point.usageBoundary,
    });
    expect(projection.deeper).toEqual({
      notes: point.notes,
      beyondBasics: point.beyondBasics,
    });
    expect(JSON.stringify(projection)).not.toContain('guidetojapanese.org');
    expect(JSON.stringify(projection)).not.toContain('furtherReading');
  });

  it('omits the deeper toggle when there is no optional nuance', () => {
    const { createGrammarCardState, projectGrammarCard } = getPresentationApi();
    const withoutNuance: GrammarPoint = {
      ...point,
      notes: undefined,
      beyondBasics: undefined,
    };

    expect(projectGrammarCard(withoutNuance, createGrammarCardState())).toMatchObject({
      deeperToggle: null,
      deeper: null,
    });
  });
});

const parseTsx = (fileName: string) => {
  const path = join(import.meta.dirname, fileName);
  const source = existsSync(path) ? readFileSync(path, 'utf8') : '';
  return {
    source,
    tree: ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX),
  };
};

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

const getJsxAttribute = (
  node: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
  name: string,
) => node.attributes.properties.find(
  (property): property is ts.JsxAttribute => ts.isJsxAttribute(property)
    && property.name.getText(node.getSourceFile()) === name,
);

const getJsxAttributeExpression = (
  node: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
  name: string,
) => {
  const initializer = getJsxAttribute(node, name)?.initializer;
  return initializer && ts.isJsxExpression(initializer) && initializer.expression
    ? initializer.expression.getText(node.getSourceFile())
    : null;
};

const getJsxAttributeText = (
  node: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
  name: string,
) => {
  const initializer = getJsxAttribute(node, name)?.initializer;
  return initializer && ts.isStringLiteral(initializer) ? initializer.text : null;
};

const getElementStyleName = (element: ts.JsxElement) => {
  const style = getJsxAttributeExpression(element.openingElement, 'style');
  return style?.match(/^styles\.(\w+)$/)?.[1] ?? null;
};

const getElementsWithStyle = (
  root: ts.Node,
  styleName: string,
) => collect(root, ts.isJsxElement).filter(
  (element) => getElementStyleName(element) === styleName,
);

const propertyAccessTexts = (root: ts.Node) => collect(root, ts.isPropertyAccessExpression)
  .map((node) => node.getText(root.getSourceFile()));

const findAncestor = <T extends ts.Node>(
  node: ts.Node,
  predicate: (candidate: ts.Node) => candidate is T,
): T | undefined => {
  let current = node.parent;
  while (current) {
    if (predicate(current)) return current;
    current = current.parent;
  }
  return undefined;
};

const getStyleObject = (
  tree: ts.SourceFile,
  styleName: string,
): ts.ObjectLiteralExpression => {
  const createCall = collect(tree, ts.isCallExpression).find(
    (call) => call.expression.getText(tree) === 'StyleSheet.create',
  );
  const definitions = createCall?.arguments[0];
  expect(definitions && ts.isObjectLiteralExpression(definitions)).toBe(true);
  const style = (definitions as ts.ObjectLiteralExpression).properties.find(
    (property): property is ts.PropertyAssignment => ts.isPropertyAssignment(property)
      && property.name.getText(tree) === styleName,
  );
  expect(style && ts.isObjectLiteralExpression(style.initializer)).toBe(true);
  return style!.initializer as ts.ObjectLiteralExpression;
};

const getStyleProperties = (style: ts.ObjectLiteralExpression) => new Map(
  style.properties
    .filter(ts.isPropertyAssignment)
    .map((property) => [
      property.name.getText(style.getSourceFile()),
      property.initializer.getText(style.getSourceFile()),
    ]),
);

const requireNode = <T,>(candidate: T | undefined, label: string): T => {
  expect(candidate, label).toBeDefined();
  return candidate!;
};

describe('GrammarCard teaching contract', () => {
  const card = parseTsx('GrammarCard.tsx');
  const grammarCard = card.tree.statements.find(
    (statement): statement is ts.FunctionDeclaration => ts.isFunctionDeclaration(statement)
      && statement.name?.text === 'GrammarCard',
  );

  const getSection = (styleName: string, label: string) => {
    const section = getElementsWithStyle(grammarCard!, styleName).find((element) => {
      const textLabels = collect(element, ts.isJsxText).map((node) => node.text.trim());
      const componentLabels = [
        ...collect(element, ts.isJsxOpeningElement),
        ...collect(element, ts.isJsxSelfClosingElement),
      ].map((node) => getJsxAttributeText(node, 'label'));
      return [...textLabels, ...componentLabels].includes(label);
    });
    expect(section, `${label} should have its own ${styleName} section`).toBeDefined();
    return section!;
  };

  const getGrammarToggle = (label: string) => requireNode(
    collect(grammarCard!, ts.isJsxSelfClosingElement).find(
      (node) => node.tagName.getText(card.tree) === 'GrammarSectionToggle'
        && getJsxAttributeText(node, 'label') === label,
    ),
    `${label} GrammarSectionToggle`,
  );

  it('ties the at-a-glance heading and plain-English pill to their content', () => {
    const heading = requireNode(
      getElementsWithStyle(grammarCard!, 'headingCopy')[0],
      'at-a-glance heading',
    );
    const translation = requireNode(
      getElementsWithStyle(grammarCard!, 'translation')[0],
      'plain-English pill',
    );

    expect(propertyAccessTexts(heading)).toEqual(expect.arrayContaining([
      'point.title',
      'point.pattern',
    ]));
    expect(propertyAccessTexts(translation)).toContain('point.plainEnglish');
  });

  it('ties basics and formation payloads to their ordered sections', () => {
    const basics = getSection('section', 'THE BASICS');
    const formation = getSection('section', 'BUILD THE FORM');
    const formationList = requireNode(
      collect(formation, ts.isJsxSelfClosingElement).find(
        (node) => node.tagName.getText(card.tree) === 'GrammarFormationList',
      ),
      'formation list inside BUILD THE FORM',
    );

    expect(propertyAccessTexts(basics)).toContain('point.explanation');
    expect(getJsxAttributeExpression(formationList, 'formation')).toBe('point.formation');
  });

  it('ties the insight toggle and expanded picture to both projected insight fields', () => {
    const insight = getSection('section', 'A JAPANESE-FIRST PICTURE');
    const toggle = getGrammarToggle('A JAPANESE-FIRST PICTURE');
    const payloads = propertyAccessTexts(insight);
    const whyPayload = requireNode(
      collect(insight, ts.isPropertyAccessExpression).find(
        (node) => node.getText(card.tree) === 'presentation.insight.whyItWorks',
      ),
      'expanded insight whyItWorks payload',
    );
    const boundaryPayload = requireNode(
      collect(insight, ts.isPropertyAccessExpression).find(
        (node) => node.getText(card.tree) === 'presentation.insight.usageBoundary',
      ),
      'expanded insight usageBoundary payload',
    );

    expect(getJsxAttributeExpression(toggle, 'presentation')).toBe('presentation.insightToggle');
    expect(getJsxAttributeExpression(toggle, 'expanded')).toBe('cardState.insightExpanded');
    expect(getJsxAttributeExpression(toggle, 'focused')).toBe("cardState.focusedToggle === 'insight'");
    expect(getJsxAttributeExpression(toggle, 'onPress')).toBe("() => toggle('insight')");
    expect(getJsxAttributeExpression(toggle, 'onFocus')).toBe("() => setFocused('insight', true)");
    expect(getJsxAttributeExpression(toggle, 'onBlur')).toBe("() => setFocused('insight', false)");
    expect(payloads).toEqual(expect.arrayContaining([
      'presentation.insight',
      'presentation.insight.whyItWorks',
      'presentation.insight.usageBoundary',
    ]));
    expect(findAncestor(whyPayload, ts.isConditionalExpression)?.condition.getText(card.tree))
      .toBe('presentation.insight');
    expect(findAncestor(boundaryPayload, ts.isConditionalExpression)?.condition.getText(card.tree))
      .toBe('presentation.insight');
  });

  it('keeps the usage boundary and contrast visible in their own sections', () => {
    const boundary = getSection('boundarySection', 'WHEN IT FITS');
    const contrast = getSection('compareBox', 'COMPARE IT');

    expect(propertyAccessTexts(boundary)).toContain('point.usageBoundary');
    expect(propertyAccessTexts(contrast)).toEqual(expect.arrayContaining([
      'point.contrast.with',
      'point.contrast.explanation',
    ]));
  });

  it('maps every example field inside the examples section', () => {
    const examples = getSection('section', 'EXAMPLES');
    const mapCall = requireNode(
      collect(examples, ts.isCallExpression).find(
        (call) => call.expression.getText(card.tree) === 'point.examples.map',
      ),
      'point.examples map',
    );
    const callback = requireNode(mapCall.arguments[0], 'point.examples map callback');
    const example = requireNode(
      getElementsWithStyle(callback, 'example')[0],
      'example row inside point.examples map',
    );

    expect(propertyAccessTexts(example)).toEqual(expect.arrayContaining([
      'example.japanese',
      'example.reading',
      'example.english',
    ]));
  });

  it('keeps the optional common mistake and deeper payloads in guarded branches', () => {
    const mistake = getSection('mistake', 'COMMON TURN');
    const deeper = getSection('section', 'GO DEEPER');
    const mistakeBranch = findAncestor(mistake, ts.isConditionalExpression);
    const deeperBranch = findAncestor(deeper, ts.isConditionalExpression);
    const deeperPayloads = propertyAccessTexts(deeper);
    const deeperToggle = getGrammarToggle('GO DEEPER');

    expect(mistakeBranch?.condition.getText(card.tree)).toBe('point.commonMistake');
    expect(propertyAccessTexts(mistake)).toEqual(expect.arrayContaining([
      'point.commonMistake.avoid',
      'point.commonMistake.prefer',
      'point.commonMistake.reason',
    ]));
    expect(deeperBranch?.condition.getText(card.tree)).toBe('presentation.deeperToggle');
    expect(getJsxAttributeExpression(deeperToggle, 'presentation')).toBe('presentation.deeperToggle');
    expect(getJsxAttributeExpression(deeperToggle, 'expanded')).toBe('cardState.deeperExpanded');
    expect(getJsxAttributeExpression(deeperToggle, 'focused')).toBe("cardState.focusedToggle === 'deeper'");
    expect(getJsxAttributeExpression(deeperToggle, 'onPress')).toBe("() => toggle('deeper')");
    expect(getJsxAttributeExpression(deeperToggle, 'onFocus')).toBe("() => setFocused('deeper', true)");
    expect(getJsxAttributeExpression(deeperToggle, 'onBlur')).toBe("() => setFocused('deeper', false)");
    expect(deeperPayloads).toEqual(expect.arrayContaining([
      'presentation.deeper',
      'presentation.deeper.notes',
      'presentation.deeper.beyondBasics',
    ]));
    const mapTargets = collect(deeper, ts.isCallExpression)
      .map((call) => call.expression.getText(card.tree));
    expect(mapTargets).toEqual(expect.arrayContaining([
      'presentation.deeper.notes?.map',
      'presentation.deeper.beyondBasics?.map',
    ]));
  });

  it('orders the structural sections as one complete teaching sequence', () => {
    const heading = requireNode(
      getElementsWithStyle(grammarCard!, 'headingCopy')[0],
      'ordered at-a-glance heading',
    );
    const translation = requireNode(
      getElementsWithStyle(grammarCard!, 'translation')[0],
      'ordered plain-English pill',
    );
    const anchors = [
      heading,
      translation,
      getSection('section', 'THE BASICS'),
      getSection('section', 'BUILD THE FORM'),
      getGrammarToggle('A JAPANESE-FIRST PICTURE'),
      getSection('boundarySection', 'WHEN IT FITS'),
      getSection('compareBox', 'COMPARE IT'),
      getSection('section', 'EXAMPLES'),
      getSection('mistake', 'COMMON TURN'),
      getSection('section', 'GO DEEPER'),
    ];

    expect(anchors.every(Boolean)).toBe(true);
    const positions = anchors.map((node) => node!.pos);
    expect([...positions].sort((left, right) => left - right)).toEqual(positions);
  });

  it('does not import link opening or render per-card references', () => {
    const imports = card.tree.statements.filter(ts.isImportDeclaration);
    const reactNativeImport = imports.find(
      (statement) => (statement.moduleSpecifier as ts.StringLiteral).text === 'react-native',
    );
    const importedNames = reactNativeImport?.importClause?.namedBindings
      && ts.isNamedImports(reactNativeImport.importClause.namedBindings)
      ? reactNativeImport.importClause.namedBindings.elements.map((element) => element.name.text)
      : [];
    const pointProperties = collect(card.tree, ts.isPropertyAccessExpression)
      .filter((node) => node.expression.getText(card.tree) === 'point')
      .map((node) => node.name.text);

    expect(importedNames).not.toContain('Linking');
    expect(pointProperties).not.toContain('furtherReading');
  });

  it('forwards button, expansion, touch-target, focus, and hidden-glyph contracts', () => {
    const toggle = card.source.match(
      /function GrammarSectionToggle[\s\S]*?return \([\s\S]*?<Pressable[\s\S]*?<\/Pressable>[\s\S]*?\);/,
    )?.[0] ?? '';

    expect(toggle).toContain('accessibilityRole={presentation.accessibilityRole}');
    expect(toggle).toContain('accessibilityState={presentation.accessibilityState}');
    expect(toggle).toContain('aria-expanded={presentation.accessibilityState.expanded}');
    expect(toggle).toContain('minHeight: presentation.minimumTouchTarget');
    expect(toggle).toContain('onFocus={onFocus}');
    expect(toggle).toContain('onBlur={onBlur}');
    expect(toggle).toContain('focused && styles.toggleFocused');
    expect(toggle).toContain('accessibilityElementsHidden');
    expect(toggle).toContain('importantForAccessibility="no"');
    expect(toggle).toContain('aria-hidden={true}');

    const baseStyle = card.source.match(/toggle:\s*\{[\s\S]*?\n\s*\},\n\s*toggleFocused:/)?.[0] ?? '';
    const focusedStyle = card.source.match(/toggleFocused:\s*\{[^}]*\}/)?.[0] ?? '';
    expect(baseStyle).toContain('borderWidth: 2');
    expect(focusedStyle).toContain('borderColor: colors.forest');
    expect(focusedStyle).not.toContain('colors.gold');
    expect(focusedStyle).not.toContain('borderWidth');
  });
});

describe('GrammarFormationList narrow-screen contract', () => {
  const formation = parseTsx('GrammarFormationList.tsx');

  it('maps every formation row into corresponding label, formula, and explanation structures', () => {
    const list = requireNode(
      getElementsWithStyle(formation.tree, 'list')[0],
      'formation list container',
    );
    const mapCall = requireNode(
      collect(list, ts.isCallExpression).find(
        (call) => call.expression.getText(formation.tree) === 'formation.map',
      ),
      'formation.map',
    );
    const callback = requireNode(mapCall.arguments[0], 'formation.map callback');
    const row = requireNode(getElementsWithStyle(callback, 'row')[0], 'formation row');
    const label = requireNode(getElementsWithStyle(row, 'label')[0], 'formation label');
    const panel = requireNode(
      getElementsWithStyle(row, 'formulaPanel')[0],
      'formation formula panel',
    );
    const formulaText = requireNode(
      getElementsWithStyle(panel, 'formula')[0],
      'formation formula text',
    );
    const explanation = requireNode(
      getElementsWithStyle(row, 'explanation')[0],
      'formation explanation',
    );
    expect(propertyAccessTexts(label)).toContain('row.label');
    expect(propertyAccessTexts(formulaText)).toContain('row.formula');
    expect(propertyAccessTexts(explanation)).toContain('row.explanation');
    expect(getJsxAttributeExpression(formulaText.openingElement, 'selectable')).toBe('true');
  });

  it('ties each relevant JSX node to a shrinkable full-width style with no fixed constraints', () => {
    for (const styleName of ['list', 'row', 'formulaPanel', 'formula']) {
      const properties = getStyleProperties(getStyleObject(formation.tree, styleName));
      expect(properties.get('width'), `${styleName} width`).toBe("'100%'");
      expect(properties.get('flexShrink'), `${styleName} flexShrink`).toBe('1');
      expect(properties.has('minWidth'), `${styleName} minWidth`).toBe(false);
      expect(properties.has('maxWidth'), `${styleName} maxWidth`).toBe(false);
    }
  });
});
