import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LessonOutline } from '../models/content';
import { colors, radii, shadows, spacing, typography } from '../theme/tokens';

export function LessonCard({ lesson, onPress }: { lesson: LessonOutline; onPress: () => void }) {
  const isReady = lesson.availability === 'ready';
  return (
    <Pressable
      accessibilityHint="Opens the lesson"
      accessibilityLabel={`Lesson ${lesson.number}: ${lesson.title}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.number, isReady ? styles.numberReady : styles.numberOutline]}>
        <Text style={[styles.numberText, !isReady && styles.numberTextOutline]}>{String(lesson.number).padStart(2, '0')}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={styles.titleWrap}>
            <Text style={styles.japanese}>{lesson.japaneseTitle}</Text>
            <Text style={styles.title}>{lesson.title}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>
        <Text style={styles.summary} numberOfLines={2}>{lesson.summary}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: spacing.lg, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, ...shadows.card },
  pressed: { opacity: 0.82, transform: [{ scale: 0.995 }] },
  number: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  numberReady: { backgroundColor: colors.coral },
  numberOutline: { backgroundColor: colors.surfaceStrong },
  numberText: { color: colors.white, fontSize: typography.small, fontWeight: '900', letterSpacing: 0.5 },
  numberTextOutline: { color: colors.inkMuted },
  body: { flex: 1, gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  titleWrap: { flex: 1 },
  japanese: { color: colors.forest, fontSize: typography.small, fontWeight: '700' },
  title: { marginTop: 2, color: colors.ink, fontSize: typography.heading, fontWeight: '800' },
  chevron: { color: colors.inkMuted, fontSize: 28, fontWeight: '300' },
  summary: { color: colors.inkMuted, fontSize: typography.small, lineHeight: 19 },
});
