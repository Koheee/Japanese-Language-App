import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../theme/tokens';

export function StorageErrorBanner() {
  return (
    <SafeAreaView
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      edges={['top', 'left', 'right']}
      style={styles.banner}
    >
      <Text style={styles.message}>
        Changes could not be saved. Your previous saved state is still intact.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.coralSoft,
    borderBottomColor: colors.error,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  message: {
    color: colors.error,
    fontSize: typography.small,
    fontWeight: '700',
    lineHeight: 19,
    textAlign: 'center',
  },
});
