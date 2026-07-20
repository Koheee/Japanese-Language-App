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

describe('GrammarCard teaching contract', () => {
  const card = parseTsx('GrammarCard.tsx');

  it('renders the complete teaching sequence in learner order', () => {
    const labels = [
      ...collect(card.tree, ts.isJsxText).map((node) => ({
        position: node.pos,
        text: node.text.trim(),
      })),
      ...collect(card.tree, ts.isJsxAttribute)
        .filter((node) => node.name.getText(card.tree) === 'label'
          && node.initializer
          && ts.isStringLiteral(node.initializer))
        .map((node) => ({
          position: node.pos,
          text: (node.initializer as ts.StringLiteral).text,
        })),
    ]
      .filter(({ text }) => Boolean(text))
      .sort((left, right) => left.position - right.position)
      .map(({ text }) => text);
    const expected = [
      'THE BASICS',
      'BUILD THE FORM',
      'A JAPANESE-FIRST PICTURE',
      'WHEN IT FITS',
      'COMPARE IT',
      'EXAMPLES',
      'COMMON TURN',
      'GO DEEPER',
    ];

    const positions = expected.map((label) => labels.indexOf(label));
    expect(positions.every((position) => position >= 0)).toBe(true);
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
    expect(focusedStyle).toContain('borderColor: colors.gold');
    expect(focusedStyle).not.toContain('borderWidth');
  });
});

describe('GrammarFormationList narrow-screen contract', () => {
  const formation = parseTsx('GrammarFormationList.tsx');

  it('renders every row field and makes formula text selectable', () => {
    const properties = collect(formation.tree, ts.isPropertyAccessExpression)
      .filter((node) => node.expression.getText(formation.tree) === 'row')
      .map((node) => node.name.text);
    const textTags = collect(formation.tree, ts.isJsxOpeningElement)
      .filter((node) => node.tagName.getText(formation.tree) === 'Text')
      .map((node) => node.getText(formation.tree));

    expect(properties).toEqual(expect.arrayContaining(['label', 'formula', 'explanation']));
    expect(textTags.some((tag) => tag.includes('selectable={true}'))).toBe(true);
  });

  it('uses shrinkable full-width rows and formula panels without a fixed width', () => {
    for (const styleName of ['row', 'formulaPanel', 'formula']) {
      const style = formation.source.match(
        new RegExp(`${styleName}:\\s*\\{[\\s\\S]*?\\n\\s*\\},`),
      )?.[0] ?? '';
      expect(style).toContain("width: '100%'");
      expect(style).toContain('flexShrink: 1');
      expect(style).not.toMatch(/width:\s*\d/);
    }
  });
});
