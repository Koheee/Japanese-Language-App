import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as React from 'react';
import type { ComponentType, PropsWithChildren } from 'react';
import ts from 'typescript';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as {
  renderToStaticMarkup: (element: React.ReactNode) => string;
};

type BoundaryProps = PropsWithChildren<Record<string, unknown>>;

const forbiddenModules = new Set([
  '@react-navigation/bottom-tabs',
  '../screens/ExerciseScreen',
  '../screens/ReviewScreen',
  '../screens/ProgressScreen',
  '../screens/VocabularyManagerScreen',
  '../screens/WordEditorScreen',
  '../screens/ImportPreviewScreen',
]);

vi.mock('react-native', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  return {
    StyleSheet: { create: <T,>(styles: T) => styles },
    View: ({ children }: BoundaryProps) => React.createElement('rn-view', null, children),
  };
});

vi.mock('react-native-safe-area-context', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  return {
    SafeAreaProvider: ({ children }: BoundaryProps) => (
      React.createElement('safe-area-provider', null, children)
    ),
  };
});

vi.mock('expo-status-bar', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  return { StatusBar: () => React.createElement('status-bar') };
});

vi.mock('../components/HydrationGate', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  return {
    HydrationGate: ({ children }: BoundaryProps) => (
      React.createElement('hydration-gate', null, children)
    ),
  };
});

vi.mock('../components/StorageErrorBanner', () => ({ StorageErrorBanner: () => null }));

vi.mock('../state/StudyContext', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  return {
    StudyProvider: ({ children }: BoundaryProps) => (
      React.createElement('study-provider', null, children)
    ),
    useStudy: () => ({ storageError: null }),
  };
});

vi.mock('@react-navigation/native', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  return {
    DefaultTheme: { colors: {} },
    NavigationContainer: ({ children }: BoundaryProps) => (
      React.createElement('navigation-container', null, children)
    ),
  };
});

vi.mock('@react-navigation/native-stack', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  type ScreenProps = { name: string };
  const Screen = (_props: ScreenProps) => null;
  const Navigator = ({ children }: BoundaryProps) => {
    const registeredRoutes = React.Children.toArray(children).flatMap((child, index) => (
      React.isValidElement<ScreenProps>(child) && child.type === Screen
        ? [React.createElement('registered-route', {
            'data-route': child.props.name,
            key: index,
          })]
        : []
    ));

    return React.createElement('stack-navigator', null, registeredRoutes);
  };

  return {
    createNativeStackNavigator: () => ({
      Navigator,
      Screen,
    }),
  };
});

vi.mock('@react-navigation/bottom-tabs', () => {
  throw new Error('Forbidden grammar-reader import: @react-navigation/bottom-tabs');
});

vi.mock('../screens/ExerciseScreen', () => {
  throw new Error('Forbidden grammar-reader import: ExerciseScreen');
});
vi.mock('../screens/ReviewScreen', () => {
  throw new Error('Forbidden grammar-reader import: ReviewScreen');
});
vi.mock('../screens/ProgressScreen', () => {
  throw new Error('Forbidden grammar-reader import: ProgressScreen');
});
vi.mock('../screens/VocabularyManagerScreen', () => {
  throw new Error('Forbidden grammar-reader import: VocabularyManagerScreen');
});
vi.mock('../screens/WordEditorScreen', () => {
  throw new Error('Forbidden grammar-reader import: WordEditorScreen');
});
vi.mock('../screens/ImportPreviewScreen', () => {
  throw new Error('Forbidden grammar-reader import: ImportPreviewScreen');
});

vi.mock('../screens/LessonListScreen', () => ({ LessonListScreen: () => null }));
vi.mock('../screens/LessonDetailScreen', () => ({ LessonDetailScreen: () => null }));
vi.mock('../screens/SearchScreen', () => ({ SearchScreen: () => null }));

let App: ComponentType;

beforeAll(async () => {
  vi.stubGlobal('React', React);
  App = (await import('../../App')).default;
});

function renderApp(): string {
  return renderToStaticMarkup(React.createElement(App));
}

function countOpeningTags(markup: string, tag: string): number {
  return [...markup.matchAll(new RegExp(`<${tag}(?:>|\\s)`, 'g'))].length;
}

function forbiddenImportsInAppNavigator(): string[] {
  const path = join(import.meta.dirname, 'AppNavigator.tsx');
  const sourceFile = ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  return sourceFile.statements.flatMap((statement) => (
    ts.isImportDeclaration(statement)
    && ts.isStringLiteral(statement.moduleSpecifier)
    && forbiddenModules.has(statement.moduleSpecifier.text)
      ? [statement.moduleSpecifier.text]
      : []
  ));
}

function expectSingleNestedChain(markup: string, tags: readonly string[]): void {
  let ancestorOpen = -1;
  let ancestorClose = markup.length;

  for (const tag of tags) {
    expect(countOpeningTags(markup, tag)).toBe(1);
    const open = markup.indexOf(`<${tag}`, ancestorOpen + 1);
    const close = markup.indexOf(`</${tag}>`, open);
    expect(open).toBeGreaterThan(ancestorOpen);
    expect(close).toBeGreaterThan(open);
    expect(close).toBeLessThan(ancestorClose);
    ancestorOpen = open;
    ancestorClose = close;
  }
}

describe('live grammar reader navigation', () => {
  it('does not import forbidden navigation or screen modules', () => {
    expect(forbiddenImportsInAppNavigator()).toEqual([]);
  });

  it('renders exactly one navigator with Lessons, LessonDetail, then Search', () => {
    const markup = renderApp();
    const routes = [...markup.matchAll(/<registered-route data-route="([^"]+)"/g)]
      .map((match) => match[1]);

    expectSingleNestedChain(markup, ['navigation-container', 'stack-navigator']);
    expect(routes).toEqual(['Lessons', 'LessonDetail', 'Search']);
  });

  it('renders StudyProvider above HydrationGate above NavigationContainer', () => {
    expectSingleNestedChain(
      renderApp(),
      ['study-provider', 'hydration-gate', 'navigation-container'],
    );
  });
});
