import { StyleSheet, Text, View } from 'react-native';

import type { GrammarFormation } from '../models/content';
import { colors, radii, spacing, typography } from '../theme/tokens';

export function GrammarFormationList({
  formation,
}: {
  formation: readonly GrammarFormation[];
}) {
  return (
    <View style={styles.list}>
      {formation.map((row, index) => (
        <View key={`${row.label}-${index}`} style={styles.row}>
          <Text style={styles.label}>{row.label}</Text>
          <View style={styles.formulaPanel}>
            <Text selectable={true} style={styles.formula}>{row.formula}</Text>
          </View>
          <Text style={styles.explanation}>{row.explanation}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    width: '100%',
    flexShrink: 1,
    gap: spacing.md,
  },
  row: {
    width: '100%',
    flexShrink: 1,
    gap: spacing.sm,
  },
  label: {
    color: colors.inkMuted,
    fontSize: typography.micro,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  formulaPanel: {
    width: '100%',
    flexShrink: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.forestSoft,
    borderRadius: radii.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.forest,
  },
  formula: {
    width: '100%',
    flexShrink: 1,
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: '800',
    lineHeight: 24,
  },
  explanation: {
    color: colors.inkMuted,
    fontSize: typography.small,
    lineHeight: 20,
  },
});
