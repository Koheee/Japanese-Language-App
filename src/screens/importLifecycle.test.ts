import {
  CommonActions,
  StackRouter,
} from '../../node_modules/.pnpm/node_modules/@react-navigation/routers';
import { describe, expect, it, vi } from 'vitest';

import {
  buildImportSuccessNavigationAction,
  createExclusiveActionCoordinator,
  createImportConfirmationController,
  handleImportPreviewBeforeRemove,
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

  it('allows route removal only after an explicit successful commit', () => {
    const controller = createImportConfirmationController();
    const clearPreview = vi.fn();
    const beforeRemove = { preventDefault: vi.fn() };

    expect(handleImportPreviewBeforeRemove(controller, beforeRemove, clearPreview)).toBe(true);
    expect(clearPreview).toHaveBeenCalledTimes(1);

    expect(controller.begin()).toBe(true);
    expect(controller.allowRemovalAfterCommit()).toBe(true);
    expect(controller.isConfirming()).toBe(false);
    expect(handleImportPreviewBeforeRemove(controller, beforeRemove, clearPreview)).toBe(true);
    expect(beforeRemove.preventDefault).not.toHaveBeenCalled();
    expect(clearPreview).toHaveBeenCalledTimes(2);
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
