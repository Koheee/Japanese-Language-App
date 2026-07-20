import { createRequire } from 'node:module';
import * as React from 'react';
import type { ComponentType, PropsWithChildren } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as {
  renderToStaticMarkup: (element: React.ReactNode) => string;
};

type BoundaryProps = PropsWithChildren<Record<string, unknown>>;

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
  return {
    createNativeStackNavigator: () => ({
      Navigator: ({ children }: BoundaryProps) => (
        React.createElement('stack-navigator', null, children)
      ),
      Screen: ({ name }: { name: string }) => (
        React.createElement('stack-screen', { 'data-route': name })
      ),
    }),
  };
});

vi.mock('../screens/LessonListScreen', () => ({ LessonListScreen: () => null }));
vi.mock('../screens/LessonDetailScreen', () => ({ LessonDetailScreen: () => null }));

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
  it('renders exactly one navigator with only Lessons then LessonDetail', () => {
    const markup = renderApp();
    const routes = [...markup.matchAll(/<stack-screen data-route="([^"]+)"/g)]
      .map((match) => match[1]);

    expect(countOpeningTags(markup, 'navigation-container')).toBe(1);
    expect(countOpeningTags(markup, 'stack-navigator')).toBe(1);
    expect(routes).toEqual(['Lessons', 'LessonDetail']);
  });

  it('renders StudyProvider above HydrationGate above NavigationContainer', () => {
    expectSingleNestedChain(
      renderApp(),
      ['study-provider', 'hydration-gate', 'navigation-container'],
    );
  });
});
