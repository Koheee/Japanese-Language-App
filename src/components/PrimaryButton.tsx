import { useState } from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors, radii, spacing, typography } from '../theme/tokens';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'text';
  style?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
  style,
  accessibilityLabel,
  accessibilityHint,
}: PrimaryButtonProps) {
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      disabled={disabled}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        focused && styles.focused,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, variant !== 'primary' && styles.labelDark]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  primary: { backgroundColor: colors.forest },
  secondary: { backgroundColor: colors.forestSoft },
  text: { backgroundColor: 'transparent' },
  label: { color: colors.white, fontSize: typography.body, fontWeight: '700' },
  labelDark: { color: colors.forest },
  disabled: { opacity: 0.38 },
  focused: { borderColor: colors.gold },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
});
