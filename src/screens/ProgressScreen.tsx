import { StyleSheet, Text, View } from 'react-native';

import { ProgressBar } from '../components/ProgressBar';
import { Screen } from '../components/Screen';
import { curriculum } from '../data/curriculum';
import { getLesson } from '../data/lessons';
import { useStudy } from '../state/StudyContext';
import { colors, radii, spacing, typography } from '../theme/tokens';

export function ProgressScreen() {
  const { state } = useStudy();
  const progressItems = Object.values(state.progress);
  const attempts = progressItems.reduce((sum, item) => sum + item.attempts, 0);
  const correct = progressItems.reduce((sum, item) => sum + item.correctAnswers, 0);
  const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0;
  const reviewed = Object.values(state.reviewCards).filter((card) => card.lastReviewedAt).length;

  return (
    <Screen scroll contentStyle={styles.page}>
      <Text style={styles.brand}>YOUR TRAIL</Text>
      <Text style={styles.title}>Small steps, visible.</Text>
      <Text style={styles.subtitle}>Progress here measures retrieval, not time spent staring at a page.</Text>

      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>COURSE JOURNEY</Text>
        <View style={styles.heroRow}><Text style={styles.heroValue}>{progressItems.length}</Text><Text style={styles.heroOf}> / {curriculum.length} lessons begun</Text></View>
        <ProgressBar value={progressItems.length / curriculum.length} accent={colors.gold} />
        <Text style={styles.heroNote}>Every lesson contains grammar, vocabulary, dialogue, practice, and spaced review.</Text>
      </View>

      <View style={styles.metrics}>
        <Metric value={`${accuracy}%`} label="practice accuracy" />
        <Metric value={String(reviewed)} label="cards reviewed" />
        <Metric value={String(attempts)} label="answers checked" />
      </View>

      <Text style={styles.sectionTitle}>Lesson activity</Text>
      {progressItems.length ? progressItems.map((item) => {
        const lesson = getLesson(item.lessonId);
        if (!lesson) return null;
        const completion = item.completedExerciseIds.length / lesson.exercises.length;
        return (
          <View key={item.lessonId} style={styles.lessonCard}>
            <View style={styles.lessonNumber}><Text style={styles.lessonNumberText}>{String(lesson.number).padStart(2, '0')}</Text></View>
            <View style={styles.lessonCopy}>
              <Text style={styles.lessonJapanese}>{lesson.japaneseTitle}</Text>
              <Text style={styles.lessonTitle}>{lesson.title}</Text>
              <ProgressBar value={completion} />
              <Text style={styles.lessonMeta}>{item.completedExerciseIds.length} of {lesson.exercises.length} exercises · {item.attempts ? Math.round((item.correctAnswers / item.attempts) * 100) : 0}% accuracy</Text>
            </View>
          </View>
        );
      }) : (
        <View style={styles.empty}><Text style={styles.emptyTitle}>No marks on the page yet</Text><Text style={styles.emptyBody}>Open Lesson 1 and begin its exercises. Your activity will collect here automatically.</Text></View>
      )}

      <View style={styles.principle}>
        <Text style={styles.principleKanji}>歩</Text>
        <View style={styles.principleCopy}>
          <Text style={styles.principleTitle}>The study principle</Text>
          <Text style={styles.principleBody}>理解して、使って、思い出す。 Understand it, use it, then retrieve it.</Text>
        </View>
      </View>
    </Screen>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: spacing.lg, paddingTop: spacing.huge, paddingBottom: spacing.huge },
  brand: { color: colors.coral, fontSize: typography.micro, fontWeight: '900', letterSpacing: 1.8 },
  title: { marginTop: spacing.sm, color: colors.ink, fontSize: typography.display, fontWeight: '900', letterSpacing: -1 },
  subtitle: { marginTop: spacing.md, color: colors.inkMuted, fontSize: typography.body, lineHeight: 24 },
  heroCard: { marginTop: spacing.xxl, padding: spacing.xl, gap: spacing.md, backgroundColor: colors.forest, borderRadius: radii.lg },
  heroLabel: { color: colors.goldSoft, fontSize: typography.micro, fontWeight: '900', letterSpacing: 1.2 },
  heroRow: { flexDirection: 'row', alignItems: 'baseline' },
  heroValue: { color: colors.white, fontSize: 44, fontWeight: '900' },
  heroOf: { color: colors.forestSoft, fontSize: typography.body, fontWeight: '700' },
  heroNote: { color: colors.forestSoft, fontSize: typography.micro, lineHeight: 17 },
  metrics: { marginTop: spacing.md, flexDirection: 'row', gap: spacing.sm },
  metric: { flex: 1, minHeight: 92, alignItems: 'center', justifyContent: 'center', padding: spacing.sm, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line },
  metricValue: { color: colors.coral, fontSize: typography.title, fontWeight: '900' },
  metricLabel: { marginTop: 2, color: colors.inkMuted, fontSize: 9, lineHeight: 13, fontWeight: '700', textAlign: 'center' },
  sectionTitle: { marginTop: spacing.xxl, marginBottom: spacing.lg, color: colors.ink, fontSize: typography.title, fontWeight: '900' },
  lessonCard: { flexDirection: 'row', gap: spacing.lg, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line },
  lessonNumber: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.coral, borderRadius: 15 },
  lessonNumberText: { color: colors.white, fontSize: typography.small, fontWeight: '900' },
  lessonCopy: { flex: 1, gap: spacing.xs },
  lessonJapanese: { color: colors.forest, fontSize: typography.micro, fontWeight: '800' },
  lessonTitle: { marginBottom: spacing.sm, color: colors.ink, fontSize: typography.heading, fontWeight: '800' },
  lessonMeta: { marginTop: spacing.xs, color: colors.inkMuted, fontSize: typography.micro },
  empty: { padding: spacing.xl, gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line },
  emptyTitle: { color: colors.ink, fontSize: typography.heading, fontWeight: '800' },
  emptyBody: { color: colors.inkMuted, fontSize: typography.small, lineHeight: 20 },
  principle: { marginTop: spacing.xxl, flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.xl, backgroundColor: colors.goldSoft, borderRadius: radii.lg },
  principleKanji: { color: colors.coral, fontSize: 40, fontWeight: '800' },
  principleCopy: { flex: 1, gap: spacing.xs },
  principleTitle: { color: colors.ink, fontSize: typography.heading, fontWeight: '800' },
  principleBody: { color: colors.inkMuted, fontSize: typography.small, lineHeight: 20 },
});
