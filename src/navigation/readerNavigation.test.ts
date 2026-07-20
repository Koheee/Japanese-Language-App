import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const navigatorSource = readFileSync(join(import.meta.dirname, 'AppNavigator.tsx'), 'utf8');
const appSource = readFileSync(join(import.meta.dirname, '..', '..', 'App.tsx'), 'utf8');

type NavigatorInspection = {
  navigatorCount: number;
  registeredRoutes: string[];
  screenImports: string[];
  unresolvedRegistrations: number;
};

function inspectNavigator(source: string): NavigatorInspection {
  const sourceFile = ts.createSourceFile(
    'AppNavigator.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const navigatorFactories = new Set<string>();
  const screenImports: string[] = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }

    const moduleName = statement.moduleSpecifier.text;
    const bindings = statement.importClause?.namedBindings;

    if (moduleName.startsWith('@react-navigation/') && bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        const importedName = element.propertyName?.text ?? element.name.text;
        if (/^create[A-Z].*Navigator$/.test(importedName)) {
          navigatorFactories.add(element.name.text);
        }
      }
    }

    if (moduleName.includes('/screens/') && statement.importClause) {
      if (statement.importClause.name) {
        screenImports.push(`${moduleName}:default as ${statement.importClause.name.text}`);
      }
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          screenImports.push(`${moduleName}:${element.propertyName?.text ?? element.name.text}`);
        }
      } else if (bindings && ts.isNamespaceImport(bindings)) {
        screenImports.push(`${moduleName}:* as ${bindings.name.text}`);
      }
    }
  }

  const navigatorNames = new Set<string>();
  const variableDeclarations: ts.VariableDeclaration[] = [];
  let navigatorCount = 0;

  const collectNavigators = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node)) {
      variableDeclarations.push(node);
    }
    if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && navigatorFactories.has(node.expression.text)
    ) {
      navigatorCount += 1;
      const declaration = node.parent;
      if (ts.isVariableDeclaration(declaration) && ts.isIdentifier(declaration.name)) {
        navigatorNames.add(declaration.name.text);
      }
    }
    ts.forEachChild(node, collectNavigators);
  };
  collectNavigators(sourceFile);

  let foundAlias = true;
  while (foundAlias) {
    foundAlias = false;
    for (const declaration of variableDeclarations) {
      if (
        ts.isIdentifier(declaration.name)
        && declaration.initializer
        && ts.isIdentifier(declaration.initializer)
        && navigatorNames.has(declaration.initializer.text)
        && !navigatorNames.has(declaration.name.text)
      ) {
        navigatorNames.add(declaration.name.text);
        foundAlias = true;
      }
    }
  }

  const registeredRoutes: string[] = [];
  let unresolvedRegistrations = 0;

  const collectScreens = (node: ts.Node): void => {
    if (
      (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node))
      && ts.isPropertyAccessExpression(node.tagName)
      && ts.isIdentifier(node.tagName.expression)
      && navigatorNames.has(node.tagName.expression.text)
      && node.tagName.name.text === 'Screen'
    ) {
      const nameAttribute = node.attributes.properties.find(
        (property): property is ts.JsxAttribute => (
          ts.isJsxAttribute(property) && property.name.getText(sourceFile) === 'name'
        ),
      );
      const initializer = nameAttribute?.initializer;

      if (initializer && ts.isStringLiteral(initializer)) {
        registeredRoutes.push(initializer.text);
      } else if (
        initializer
        && ts.isJsxExpression(initializer)
        && initializer.expression
        && ts.isStringLiteral(initializer.expression)
      ) {
        registeredRoutes.push(initializer.expression.text);
      } else {
        unresolvedRegistrations += 1;
      }
    }
    ts.forEachChild(node, collectScreens);
  };
  collectScreens(sourceFile);

  return {
    navigatorCount,
    registeredRoutes,
    screenImports,
    unresolvedRegistrations,
  };
}

type ComponentDefinition = {
  body: ts.ConciseBody;
  sourceFile: ts.SourceFile;
};

function collectComponents(sources: Record<string, string>): Map<string, ComponentDefinition> {
  const components = new Map<string, ComponentDefinition>();

  for (const [fileName, source] of Object.entries(sources)) {
    const sourceFile = ts.createSourceFile(
      fileName,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    for (const statement of sourceFile.statements) {
      if (ts.isFunctionDeclaration(statement) && statement.name && statement.body) {
        components.set(statement.name.text, { body: statement.body, sourceFile });
        continue;
      }
      if (!ts.isVariableStatement(statement)) {
        continue;
      }
      for (const declaration of statement.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name)
          && declaration.initializer
          && (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))
        ) {
          components.set(declaration.name.text, {
            body: declaration.initializer.body,
            sourceFile,
          });
        }
      }
    }
  }

  return components;
}

function returnedExpressions(definition: ComponentDefinition): ts.Expression[] {
  if (!ts.isBlock(definition.body)) {
    return [definition.body];
  }

  const expressions: ts.Expression[] = [];
  const visit = (node: ts.Node): void => {
    if (node !== definition.body && ts.isFunctionLike(node)) {
      return;
    }
    if (ts.isReturnStatement(node) && node.expression) {
      expressions.push(node.expression);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(definition.body);
  return expressions;
}

function hasLiveRenderedChain(
  sources: Record<string, string>,
  entryComponent: string,
  expectedChain: readonly string[],
): boolean {
  const components = collectComponents(sources);

  const visitExpression = (
    expression: ts.Expression,
    matched: number,
    expansionPath: ReadonlySet<string>,
  ): boolean => {
    if (
      ts.isParenthesizedExpression(expression)
      || ts.isAsExpression(expression)
      || ts.isTypeAssertionExpression(expression)
      || ts.isNonNullExpression(expression)
    ) {
      return visitExpression(expression.expression, matched, expansionPath);
    }
    if (ts.isJsxElement(expression) || ts.isJsxSelfClosingElement(expression)) {
      return visitJsx(expression, matched, expansionPath);
    }
    if (ts.isJsxFragment(expression)) {
      return expression.children.some((child) => visitJsxChild(child, matched, expansionPath));
    }
    if (ts.isConditionalExpression(expression)) {
      return (
        visitExpression(expression.whenTrue, matched, expansionPath)
        || visitExpression(expression.whenFalse, matched, expansionPath)
      );
    }
    if (ts.isBinaryExpression(expression)) {
      return (
        visitExpression(expression.left, matched, expansionPath)
        || visitExpression(expression.right, matched, expansionPath)
      );
    }
    if (ts.isArrayLiteralExpression(expression)) {
      return expression.elements.some(
        (element) => ts.isExpression(element) && visitExpression(element, matched, expansionPath),
      );
    }
    return false;
  };

  const visitJsxChild = (
    child: ts.JsxChild,
    matched: number,
    expansionPath: ReadonlySet<string>,
  ): boolean => {
    if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child)) {
      return visitExpression(child, matched, expansionPath);
    }
    if (ts.isJsxExpression(child) && child.expression) {
      return visitExpression(child.expression, matched, expansionPath);
    }
    return false;
  };

  const visitJsx = (
    node: ts.JsxElement | ts.JsxSelfClosingElement,
    matched: number,
    expansionPath: ReadonlySet<string>,
  ): boolean => {
    const tagName = (ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName).getText();
    const nextMatched = tagName === expectedChain[matched] ? matched + 1 : matched;
    if (nextMatched === expectedChain.length) {
      return true;
    }

    const definition = components.get(tagName);
    if (definition && !expansionPath.has(tagName)) {
      const nextPath = new Set(expansionPath);
      nextPath.add(tagName);
      if (
        returnedExpressions(definition).some(
          (expression) => visitExpression(expression, nextMatched, nextPath),
        )
      ) {
        return true;
      }
    }

    return ts.isJsxElement(node)
      && node.children.some((child) => visitJsxChild(child, nextMatched, expansionPath));
  };

  const entry = components.get(entryComponent);
  if (!entry || expectedChain.length === 0) {
    return false;
  }
  return returnedExpressions(entry).some(
    (expression) => visitExpression(expression, 0, new Set([entryComponent])),
  );
}

describe('grammar reader navigation', () => {
  it('registers exactly one navigator with only Lessons and LessonDetail', () => {
    const inspection = inspectNavigator(navigatorSource);

    expect(inspection.navigatorCount).toBe(1);
    expect(inspection.registeredRoutes).toEqual(['Lessons', 'LessonDetail']);
    expect(inspection.unresolvedRegistrations).toBe(0);
    expect(inspection.screenImports).toEqual([
      '../screens/LessonDetailScreen:LessonDetailScreen',
      '../screens/LessonListScreen:LessonListScreen',
    ]);
  });

  it('detects routes registered through an aliased second navigator', () => {
    const deceptiveNavigator = `
      import { createNativeStackNavigator as makeStack } from '@react-navigation/native-stack';
      const LearnStack = makeStack();
      const HiddenStack = makeStack();
      const HiddenAlias = HiddenStack;
      export function AppNavigator() {
        return (
          <>
            <LearnStack.Navigator>
              <LearnStack.Screen name="Lessons" component={LessonListScreen} />
              <LearnStack.Screen name="LessonDetail" component={LessonDetailScreen} />
            </LearnStack.Navigator>
            <HiddenAlias.Navigator>
              <HiddenAlias.Screen name="Exercise" component={ExerciseScreen} />
            </HiddenAlias.Navigator>
          </>
        );
      }
    `;

    expect(inspectNavigator(deceptiveNavigator)).toMatchObject({
      navigatorCount: 2,
      registeredRoutes: ['Lessons', 'LessonDetail', 'Exercise'],
      unresolvedRegistrations: 0,
    });
  });

  it('ignores navigation and dormant-screen names in harmless comments', () => {
    const commentedNavigator = `
      import { createNativeStackNavigator } from '@react-navigation/native-stack';
      const LearnStack = createNativeStackNavigator();
      // createBottomTabNavigator and ExerciseScreen are intentionally not live.
      export function AppNavigator() {
        return (
          <LearnStack.Navigator>
            <LearnStack.Screen name="Lessons" component={LessonListScreen} />
            <LearnStack.Screen name="LessonDetail" component={LessonDetailScreen} />
          </LearnStack.Navigator>
        );
      }
    `;

    expect(inspectNavigator(commentedNavigator)).toMatchObject({
      navigatorCount: 1,
      registeredRoutes: ['Lessons', 'LessonDetail'],
      screenImports: [],
      unresolvedRegistrations: 0,
    });
  });

  it('keeps StudyProvider above HydrationGate above the live NavigationContainer', () => {
    expect(hasLiveRenderedChain(
      { 'App.tsx': appSource, 'AppNavigator.tsx': navigatorSource },
      'App',
      ['StudyProvider', 'HydrationGate', 'NavigationContainer'],
    )).toBe(true);
  });

  it('rejects provider names that exist only in comments or an unused component', () => {
    const deceptiveApp = `
      // <StudyProvider><HydrationGate><NavigationContainer /></HydrationGate></StudyProvider>
      function DeadTree() {
        return <StudyProvider><HydrationGate><NavigationContainer /></HydrationGate></StudyProvider>;
      }
      export default function App() {
        return <AppNavigator />;
      }
      function AppNavigator() {
        return <NavigationContainer />;
      }
    `;

    expect(hasLiveRenderedChain(
      { 'App.tsx': deceptiveApp },
      'App',
      ['StudyProvider', 'HydrationGate', 'NavigationContainer'],
    )).toBe(false);
  });

  it('rejects the providers when their live nesting order is reversed', () => {
    const reversedProviders = `
      export default function App() {
        return <HydrationGate><StudyProvider><NavigationContainer /></StudyProvider></HydrationGate>;
      }
    `;

    expect(hasLiveRenderedChain(
      { 'App.tsx': reversedProviders },
      'App',
      ['StudyProvider', 'HydrationGate', 'NavigationContainer'],
    )).toBe(false);
  });
});
