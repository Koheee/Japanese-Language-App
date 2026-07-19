import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface StorageRecoveryScreenProps {
  message: string | null;
  retryHydration: () => Promise<void>;
}

export function StorageRecoveryScreen({
  message,
  retryHydration,
}: StorageRecoveryScreenProps) {
  const tryAgain = async () => {
    await retryHydration();
  };

  return (
    <Screen contentStyle={styles.page}>
      <View style={styles.mark}><Text style={styles.markText}>!</Text></View>
      <Text style={styles.eyebrow}>STORAGE RECOVERY</Text>
      <Text style={styles.title}>Your study state needs another try.</Text>
      <Text style={styles.body}>
        Your saved data was not changed. Try loading it again when device storage is available.
      </Text>
      {message ? <Text style={styles.detail}>{message}</Text> : null}
      <PrimaryButton label="Try again" onPress={tryAgain} style={styles.action} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.huge,
  },
  mark: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.coralSoft,
    borderRadius: radii.lg,
  },
  markText: { color: colors.coral, fontSize: typography.title, fontWeight: '900' },
  eyebrow: {
    marginTop: spacing.xl,
    color: colors.coral,
    fontSize: typography.micro,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  title: {
    marginTop: spacing.sm,
    color: colors.ink,
    fontSize: typography.display,
    fontWeight: '900',
  },
  body: {
    marginTop: spacing.md,
    color: colors.inkMuted,
    fontSize: typography.body,
    lineHeight: 24,
  },
  detail: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    color: colors.inkMuted,
    fontSize: typography.small,
    lineHeight: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
  },
  action: { marginTop: spacing.xl },
});
