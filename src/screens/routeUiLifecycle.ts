export type RouteUiActionOutcome<T> =
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; error: unknown };

export interface RouteUiLifecycleCoordinator {
  mount: () => void;
  activate: () => void;
  blur: () => void;
  remove: () => void;
  capture: () => number;
  canApply: (capture: number) => boolean;
  canCleanup: () => boolean;
}

export const createRouteUiLifecycleCoordinator = (): RouteUiLifecycleCoordinator => {
  let mounted = true;
  let active = false;
  let lifecycle = 0;
  return {
    mount: () => {
      if (mounted) return;
      mounted = true;
      lifecycle += 1;
    },
    activate: () => {
      if (mounted) active = true;
    },
    blur: () => {
      if (!active) return;
      active = false;
      lifecycle += 1;
    },
    remove: () => {
      if (!mounted) return;
      mounted = false;
      active = false;
      lifecycle += 1;
    },
    capture: () => mounted && active ? lifecycle : -1,
    canApply: (capture) => mounted && active && capture === lifecycle,
    canCleanup: () => mounted,
  };
};

export const runRouteUiAction = async <T>(
  coordinator: RouteUiLifecycleCoordinator,
  operation: () => Promise<T>,
  apply: (outcome: RouteUiActionOutcome<T>) => void,
  cleanup?: () => void,
): Promise<void> => {
  const capture = coordinator.capture();
  let outcome: RouteUiActionOutcome<T>;
  try {
    outcome = { status: 'fulfilled', value: await operation() };
  } catch (error) {
    outcome = { status: 'rejected', error };
  }
  if (coordinator.canCleanup()) cleanup?.();
  if (coordinator.canApply(capture)) apply(outcome);
};
