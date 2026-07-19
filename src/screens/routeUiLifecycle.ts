export type RouteUiActionOutcome<T> =
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; error: unknown };

export interface RouteUiLifecycleCoordinator {
  activate: () => void;
  deactivate: () => void;
  capture: () => number;
  canApply: (capture: number) => boolean;
}

export const createRouteUiLifecycleCoordinator = (): RouteUiLifecycleCoordinator => {
  let active = false;
  let lifecycle = 0;
  return {
    activate: () => { active = true; },
    deactivate: () => {
      if (!active) return;
      active = false;
      lifecycle += 1;
    },
    capture: () => active ? lifecycle : -1,
    canApply: (capture) => active && capture === lifecycle,
  };
};

export const runRouteUiAction = async <T>(
  coordinator: RouteUiLifecycleCoordinator,
  operation: () => Promise<T>,
  apply: (outcome: RouteUiActionOutcome<T>) => void,
): Promise<void> => {
  const capture = coordinator.capture();
  let outcome: RouteUiActionOutcome<T>;
  try {
    outcome = { status: 'fulfilled', value: await operation() };
  } catch (error) {
    outcome = { status: 'rejected', error };
  }
  if (coordinator.canApply(capture)) apply(outcome);
};
