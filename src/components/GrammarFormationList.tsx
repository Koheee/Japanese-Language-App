import { StyleSheet, Text, View } from 'react-native';

import type { GrammarFormation } from '../models/content';
import { highlightSearchText } from '../search/searchLessons';
import { colors, radii, spacing, typography } from '../theme/tokens';

const renderSegments = (text: string, query: string) => highlightSearchText(text, query).map((segment, index) => (
  <Text key={`${index}-${segment.text}`} style={segment.highlighted ? styles.highlighted : undefined}>
    {segment.text}
  </Text>
));

export function GrammarFormationList({
  formation,
  highlightQuery,
}: {
  formation: readonly GrammarFormation[];
  highlightQuery?: string;
}) {
  return (
    <View style={styles.list}>
      {formation.map((row, index) => (
        <View key={`${row.label}-${index}`} style={styles.row}>
          <Text style={styles.label}>{highlightQuery ? renderSegments(row.label, highlightQuery) : row.label}</Text>
          <View style={styles.formulaPanel}>
            <Text selectable={true} style={styles.formula}>
              {highlightQuery ? renderSegments(row.formula, highlightQuery) : row.formula}
            </Text>
          </View>
          <Text style={styles.explanation}>
            {highlightQuery ? renderSegments(row.explanation, highlightQuery) : row.explanation}
          </Text>
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
  highlighted: {
    backgroundColor: colors.goldSoft,
    color: colors.ink,
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
});
