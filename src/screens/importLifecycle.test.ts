import {
  CommonActions,
  StackRouter,
} from '../../node_modules/.pnpm/node_modules/@react-navigation/routers';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import {
  buildImportSuccessNavigationAction,
  createExclusiveActionCoordinator,
  createImportConfirmationController,
  handleImportPreviewBeforeRemove,
  requestImportPreviewCancel,
} from './importLifecycle';

describe('import confirmation lifecycle', () => {
  it('prevents removal synchronously for the full confirmation flight', () => {
    const controller = createImportConfirmationController();
    const clearPreview = vi.fn();
    const beforeRemove = { preventDefault: vi.fn() };

    expect(controller.begin()).toBe(true);
    expect(controller.begin()).toBe(false);
    expect(controller.isConfirming()).toBe(true);

    expect(handleImportPreviewBeforeRemove(controller, beforeRemove, clearPreview)).toBe(false);
    expect(beforeRemove.preventDefault).toHaveBeenCalledTimes(1);
    expect(clearPreview).not.toHaveBeenCalled();

    controller.finishFailure();
    expect(controller.isConfirming()).toBe(false);
    expect(handleImportPreviewBeforeRemove(controller, beforeRemove, clearPreview)).toBe(true);
    expect(clearPreview).toHaveBeenCalledTimes(1);
  });

  it('keeps direct removal blocked after commit until deferred navigation claims it once', () => {
    const controller = createImportConfirmationController();
    const clearPreview = vi.fn();
    const beforeRemove = { preventDefault: vi.fn() };

    expect(controller.begin()).toBe(true);
    expect(controller.commitSuccess()).toBe(true);
    expect(controller.isConfirming()).toBe(false);
    expect(handleImportPreviewBeforeRemove(controller, beforeRemove, clearPreview)).toBe(false);
    expect(beforeRemove.preventDefault).toHaveBeenCalledTimes(1);
    expect(clearPreview).not.toHaveBeenCalled();

    expect(controller.takeSuccessNavigation()).toBe(true);
    expect(controller.takeSuccessNavigation()).toBe(false);
    expect(handleImportPreviewBeforeRemove(controller, beforeRemove, clearPreview)).toBe(true);
    expect(clearPreview).toHaveBeenCalledTimes(1);
  });

  it('lets beforeRemove perform the only preview clear for Cancel', () => {
    const controller = createImportConfirmationController();
    const goBack = vi.fn();
    const clearPreview = vi.fn();

    expect(requestImportPreviewCancel(controller, goBack)).toBe(true);
    expect(goBack).toHaveBeenCalledTimes(1);
    expect(clearPreview).not.toHaveBeenCalled();

    expect(handleImportPreviewBeforeRemove(
      controller,
      { preventDefault: vi.fn() },
      clearPreview,
    )).toBe(true);
    expect(clearPreview).toHaveBeenCalledTimes(1);
  });

  it('does not clear preview when another listener already prevented removal', () => {
    const controller = createImportConfirmationController();
    const clearPreview = vi.fn();

    expect(handleImportPreviewBeforeRemove(
      controller,
      { defaultPrevented: true, preventDefault: vi.fn() },
      clearPreview,
    )).toBe(false);
    expect(clearPreview).not.toHaveBeenCalled();
  });
});

describe('Progress action ownership', () => {
  it('rejects queued export and undo until the picker releases its read claim', () => {
    const coordinator = createExclusiveActionCoordinator<'export' | 'import' | 'undo'>();

    expect(coordinator.claim('import')).toBe(true);
    expect(coordinator.owns('import')).toBe(true);
    expect(coordinator.claim('export')).toBe(false);
    expect(coordinator.claim('undo')).toBe(false);
    expect(coordinator.release('export')).toBe(false);
    expect(coordinator.owns('import')).toBe(true);
    expect(coordinator.release('import')).toBe(true);
    expect(coordinator.claim('undo')).toBe(true);
  });
});

describe('installed root stack router', () => {
  const routeConfig = {
    routeNames: ['MainTabs', 'ImportPreview'],
    routeParamList: { MainTabs: undefined, ImportPreview: undefined },
    routeGetIdList: {},
  };
  const router = StackRouter({ initialRouteName: 'MainTabs' });

  const apply = (
    state: ReturnType<typeof router.getInitialState>,
    action: Parameters<typeof router.getStateForAction>[1],
  ) => {
    const next = router.getStateForAction(state, action, routeConfig);
    expect(next).not.toBeNull();
    return next as ReturnType<typeof router.getInitialState>;
  };

  it('unwinds preview to the existing Progress tab without accumulating MainTabs routes', () => {
    let state = router.getInitialState(routeConfig);
    const originalMainTabsKey = state.routes[0]!.key;

    for (let cycle = 0; cycle < 2; cycle += 1) {
      state = apply(state, CommonActions.navigate('ImportPreview'));
      expect(state.routes.map(({ name }) => name)).toEqual(['MainTabs', 'ImportPreview']);

      state = apply(state, buildImportSuccessNavigationAction());
      expect(state.index).toBe(0);
      expect(state.routes).toHaveLength(1);
      expect(state.routes[0]).toMatchObject({
        key: originalMainTabsKey,
        name: 'MainTabs',
        params: { screen: 'Progress' },
      });
    }
  });
});

describe('installed native-stack removal contract', () => {
  it('connects ImportPreview prevention to the native iOS dismissal prop', () => {
    const screenSource = readFileSync(
      join(import.meta.dirname, 'ImportPreviewScreen.tsx'),
      'utf8',
    );
    const nativeStackSource = readFileSync(join(
      process.cwd(),
      'node_modules/@react-navigation/native-stack/src/views/NativeStackView.native.tsx',
    ), 'utf8');
    const preventRemoveHookSource = readFileSync(join(
      process.cwd(),
      'node_modules/.pnpm/node_modules/@react-navigation/core/src/usePreventRemove.tsx',
    ), 'utf8');

    expect(screenSource).toContain(
      "import { usePreventRemove } from '@react-navigation/native';",
    );
    expect(screenSource).toContain('usePreventRemove(isConfirming');
    expect(screenSource).toContain("navigation.addListener('beforeRemove'");
    expect(preventRemoveHookSource).toContain(
      'setPreventRemove(id, routeKey, preventRemove);',
    );
    expect(nativeStackSource).toContain(
      'const { preventedRoutes } = usePreventRemoveContext();',
    );
    expect(nativeStackSource).toContain(
      'preventNativeDismiss={isRemovePrevented} // on iOS',
    );
  });
});
