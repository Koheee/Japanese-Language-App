import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows, spacing, typography } from '../theme/tokens';
import { PrimaryButton } from './PrimaryButton';

interface UndoSnackbarProps {
  mutation: 'hidden' | 'restored';
  disabled?: boolean;
  onUndo(): void;
}

export function UndoSnackbar({ mutation, disabled = false, onUndo }: UndoSnackbarProps) {
  return (
    <View
      accessibilityLiveRegion="assertive"
      accessibilityRole="alert"
      style={styles.snackbar}
    >
      <Text style={styles.message}>
        {mutation === 'hidden' ? 'Word hidden.' : 'Word restored.'}
      </Text>
      <PrimaryButton
        accessibilityHint="Reverses the most recent hide or restore"
        accessibilityLabel="Undo vocabulary change"
        disabled={disabled}
        label="Undo"
        onPress={onUndo}
        style={styles.undo}
        variant="secondary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  snackbar: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    ...shadows.card,
  },
  message: {
    flex: 1,
    color: colors.white,
    fontSize: typography.small,
    fontWeight: '700',
  },
  undo: {
    minHeight: 44,
    minWidth: 72,
    paddingHorizontal: spacing.md,
  },
});
