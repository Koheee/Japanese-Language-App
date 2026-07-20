import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SearchResult } from '../search/types';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { HighlightedText } from './HighlightedText';

interface Props {
  result: SearchResult;
  onPress: () => void;
}

export function SearchResultCard({ result, onPress }: Props) {
  const kindLabel = result.kind === 'grammar' ? 'Grammar' : 'Dialogue';
  return (
    <Pressable
      accessibilityHint="Opens this match inside its lesson."
      accessibilityLabel={`Lesson ${result.lessonNumber}, ${kindLabel}, ${result.title}. ${result.excerpt}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.metaRow}>
        <Text style={styles.lesson}>LESSON {String(result.lessonNumber).padStart(2, '0')}</Text>
        <Text style={styles.kind}>{kindLabel}</Text>
      </View>
      <Text style={styles.title}>{result.title}</Text>
      {result.subtitle ? <Text style={styles.subtitle}>{result.subtitle}</Text> : null}
      <HighlightedText segments={result.segments} style={styles.excerpt} />
      <View style={styles.footerRow}>
        <Text style={styles.lessonTitle}>{result.lessonTitle}</Text>
        <Text style={styles.matchCount}>{result.matchCount} {result.matchCount === 1 ? 'match' : 'matches'} ›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 44,
    width: '100%',
    gap: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.76 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  lesson: { color: colors.coral, fontSize: typography.micro, fontWeight: '900', letterSpacing: 1 },
  kind: { color: colors.forest, fontSize: typography.micro, fontWeight: '800' },
  title: { color: colors.ink, fontSize: typography.heading, fontWeight: '900' },
  subtitle: { color: colors.coral, fontSize: typography.small, fontWeight: '800', lineHeight: 20 },
  excerpt: { color: colors.ink, fontSize: typography.small, lineHeight: 22 },
  footerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md },
  lessonTitle: { flex: 1, color: colors.inkMuted, fontSize: typography.micro },
  matchCount: { color: colors.forest, fontSize: typography.micro, fontWeight: '800' },
});

