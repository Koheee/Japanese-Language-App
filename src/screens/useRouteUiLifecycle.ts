import { useIsFocused } from '@react-navigation/native';
import { useEffect, useRef } from 'react';

import {
  RouteUiLifecycleCoordinator,
  createRouteUiLifecycleCoordinator,
} from './routeUiLifecycle';

interface RemovalAwareNavigation {
  addListener: (event: 'beforeRemove', listener: () => void) => () => void;
}

export const useRouteUiLifecycle = (
  navigation: RemovalAwareNavigation,
): RouteUiLifecycleCoordinator => {
  const isFocused = useIsFocused();
  const coordinatorRef = useRef<RouteUiLifecycleCoordinator | null>(null);
  const coordinator = coordinatorRef.current ??= createRouteUiLifecycleCoordinator();

  useEffect(() => {
    coordinator.mount();
    return () => coordinator.remove();
  }, [coordinator]);

  useEffect(() => {
    if (isFocused) coordinator.activate();
    else coordinator.blur();
  }, [coordinator, isFocused]);

  useEffect(
    () => navigation.addListener('beforeRemove', coordinator.remove),
    [coordinator, navigation],
  );

  return coordinator;
};
