import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../theme/tokens';

export function SearchButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityHint="Opens keyword search across grammar and dialogue in all lessons."
      accessibilityLabel="Search all lessons"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <View style={styles.glyph}>
        <Text accessibilityElementsHidden aria-hidden={true} style={styles.glyphText}>⌕</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>SEARCH ALL LESSONS</Text>
        <Text style={styles.label}>Find a grammar note or dialogue</Text>
      </View>
      <Text accessibilityElementsHidden aria-hidden={true} style={styles.arrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceStrong,
  },
  pressed: { opacity: 0.76 },
  glyph: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.coralSoft },
  glyphText: { color: colors.coral, fontSize: typography.heading, fontWeight: '900' },
  copy: { flex: 1, gap: 2 },
  eyebrow: { color: colors.coral, fontSize: typography.micro, fontWeight: '900', letterSpacing: 1 },
  label: { color: colors.ink, fontSize: typography.small, fontWeight: '800' },
  arrow: { color: colors.forest, fontSize: typography.heading, fontWeight: '900' },
});

