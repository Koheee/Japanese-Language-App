import { PropsWithChildren } from 'react';
import { StyleSheet, Text } from 'react-native';

import { StorageRecoveryScreen } from '../screens/StorageRecoveryScreen';
import { useStudy } from '../state/StudyContext';
import { colors, typography } from '../theme/tokens';
import { Screen } from './Screen';

export function HydrationGate({ children }: PropsWithChildren) {
  const { hydrationStatus, hydrationMessage, retryHydration } = useStudy();

  if (hydrationStatus === 'loading') {
    return (
      <Screen contentStyle={styles.center}>
        <Text style={styles.loading}>Preparing your saved study state…</Text>
      </Screen>
    );
  }

  if (hydrationStatus === 'recovery') {
    return (
      <StorageRecoveryScreen
        message={hydrationMessage}
        retryHydration={retryHydration}
      />
    );
  }

  return children;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  loading: { color: colors.inkMuted, fontSize: typography.small },
});
