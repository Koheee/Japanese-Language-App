import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProgressBar } from '../components/ProgressBar';
import { Screen } from '../components/Screen';
import { ReviewRating } from '../models/review';
import { formatInterval, getReviewStats } from '../services/srs';
import { createActionLock } from '../state/appStateCommitter';
import { useStudy } from '../state/StudyContext';
import { colors, radii, shadows, spacing, typography } from '../theme/tokens';

const ratings: { id: ReviewRating; label: string; color: string }[] = [
  { id: 'again', label: 'Again', color: colors.error },
  { id: 'hard', label: 'Hard', color: colors.gold },
  { id: 'good', label: 'Good', color: colors.success },
  { id: 'easy', label: 'Easy', color: colors.forest },
];

export function ReviewScreen() {
  const { state, dueCards, rateReview } = useStudy();
  const [revealed, setRevealed] = useState(false);
  const [isRating, setIsRating] = useState(false);
  const mountedRef = useRef(true);
  const rateLockRef = useRef<ReturnType<typeof createActionLock> | null>(null);
  const rateLock = rateLockRef.current ??= createActionLock();
  const card = dueCards[0];
  const { activeTotal, reviewedActive } = getReviewStats(state.reviewCards);

  useEffect(() => setRevealed(false), [card?.id]);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  if (!card) {
    return (
      <Screen scroll contentStyle={styles.page}>
        <Text style={styles.brand}>REVIEW ROOM</Text>
        <View style={styles.emptyMark}><Text style={styles.emptyKanji}>済</Text></View>
        <Text style={styles.emptyTitle}>{activeTotal ? 'You’re caught up.' : 'Your deck is quiet.'}</Text>
        <Text style={styles.emptyBody}>{activeTotal ? 'The next cards will appear when their memory interval ends. A little space is what makes recall stronger.' : 'Begin Lesson 1 practice to add its vocabulary and grammar patterns here.'}</Text>
        <View style={styles.emptyStats}>
          <View style={styles.emptyStat}><Text style={styles.emptyValue}>{activeTotal}</Text><Text style={styles.emptyLabel}>cards in deck</Text></View>
          <View style={styles.emptyDivider} />
          <View style={styles.emptyStat}><Text style={styles.emptyValue}>{reviewedActive}</Text><Text style={styles.emptyLabel}>reviewed</Text></View>
        </View>
      </Screen>
    );
  }

  const handleRating = async (rating: ReviewRating) => {
    const work = rateLock.tryRun(async () => {
      const cardId = card.id;
      setIsRating(true);
      try {
        const result = await rateReview(cardId, rating);
        if (result.ok && mountedRef.current) setRevealed(false);
      } finally {
        if (mountedRef.current) setIsRating(false);
      }
    });
    if (work) await work;
  };

  return (
    <Screen scroll contentStyle={styles.page}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.brand}>REVIEW ROOM</Text>
          <Text style={styles.title}>Recall, then reveal.</Text>
        </View>
        <View style={styles.dueBadge}><Text style={styles.dueValue}>{dueCards.length}</Text><Text style={styles.dueLabel}>DUE</Text></View>
      </View>

      <View style={styles.progressWrap}>
        <ProgressBar value={reviewedActive / Math.max(activeTotal, 1)} accent={colors.gold} />
        <Text style={styles.progressLabel}>{card.kind === 'vocabulary' ? 'WORD' : 'GRAMMAR'} · LESSON {card.lessonId.slice(-2)}</Text>
      </View>

      <Pressable
        accessibilityHint={revealed
          ? 'Choose a rating below to schedule this card.'
          : 'Shows the answer so you can rate your recall.'}
        accessibilityLabel={revealed
          ? `Answer revealed for ${card.prompt}`
          : `Reveal answer for ${card.prompt}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: revealed }}
        aria-expanded={revealed}
        onPress={() => setRevealed(true)}
        style={[styles.card, revealed && styles.cardRevealed]}
      >
        <Text style={styles.cardKind}>{card.supportingText}</Text>
        <View style={styles.promptWrap}>
          <Text style={styles.prompt}>{card.prompt}</Text>
          {!revealed ? <Text style={styles.recallCue}>Say the meaning before you tap.</Text> : null}
        </View>
        {revealed ? (
          <View style={styles.answerWrap}>
            <View style={styles.answerLine} />
            <Text style={styles.answerLabel}>ANSWER</Text>
            <Text style={styles.answer}>{card.answer}</Text>
          </View>
        ) : (
          <View style={styles.tapPill}><Text style={styles.tapText}>Tap to reveal</Text></View>
        )}
      </Pressable>

      {revealed ? (
        <View style={styles.ratingArea}>
          <Text style={styles.ratingPrompt}>How available was the memory?</Text>
          <View style={styles.ratingRow}>
            {ratings.map((rating) => (
              <Pressable
                accessibilityHint="Schedules this card using the selected recall rating"
                accessibilityLabel={`${rating.label}, next review ${formatInterval(rating.id, card)}`}
                accessibilityRole="button"
                key={rating.id}
                disabled={isRating}
                onPress={() => handleRating(rating.id)}
                style={[styles.ratingButton, isRating && styles.ratingButtonDisabled]}
              >
                <Text style={[styles.ratingLabel, { color: rating.color }]}>{rating.label}</Text>
                <Text style={styles.interval}>{formatInterval(rating.id, card)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <Text style={styles.instruction}>Retrieval works best before recognition. Give yourself a real moment to answer.</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.huge, paddingBottom: spacing.huge },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.lg },
  brand: { color: colors.coral, fontSize: typography.micro, fontWeight: '900', letterSpacing: 1.8 },
  title: { marginTop: spacing.sm, color: colors.ink, fontSize: typography.title, fontWeight: '900' },
  dueBadge: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.coralSoft, borderRadius: 18 },
  dueValue: { color: colors.coral, fontSize: typography.heading, fontWeight: '900' },
  dueLabel: { color: colors.coral, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  progressWrap: { marginTop: spacing.xl, gap: spacing.sm },
  progressLabel: { color: colors.inkMuted, fontSize: typography.micro, fontWeight: '800', letterSpacing: 1 },
  card: { minHeight: 390, marginTop: spacing.xxl, alignItems: 'center', justifyContent: 'space-between', padding: spacing.xl, backgroundColor: colors.surface, borderRadius: 28, borderWidth: 1, borderColor: colors.line, ...shadows.card },
  cardRevealed: { backgroundColor: colors.forestSoft, borderColor: colors.forest },
  cardKind: { color: colors.inkMuted, fontSize: typography.micro, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  promptWrap: { alignItems: 'center', gap: spacing.md },
  prompt: { color: colors.ink, fontSize: 38, lineHeight: 49, fontWeight: '800', textAlign: 'center' },
  recallCue: { color: colors.inkMuted, fontSize: typography.small, textAlign: 'center' },
  tapPill: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.surfaceStrong, borderRadius: radii.pill },
  tapText: { color: colors.forest, fontSize: typography.small, fontWeight: '800' },
  answerWrap: { alignSelf: 'stretch', alignItems: 'center', gap: spacing.sm },
  answerLine: { width: '100%', height: 1, marginBottom: spacing.md, backgroundColor: 'rgba(49,91,74,0.22)' },
  answerLabel: { color: colors.forest, fontSize: typography.micro, fontWeight: '900', letterSpacing: 1.3 },
  answer: { color: colors.ink, fontSize: typography.heading, lineHeight: 26, fontWeight: '800', textAlign: 'center' },
  ratingArea: { marginTop: spacing.xl, gap: spacing.md },
  ratingPrompt: { color: colors.inkMuted, fontSize: typography.small, textAlign: 'center' },
  ratingRow: { flexDirection: 'row', gap: spacing.sm },
  ratingButton: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, gap: 2, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line },
  ratingButtonDisabled: { opacity: 0.5 },
  ratingLabel: { fontSize: typography.small, fontWeight: '900' },
  interval: { color: colors.inkMuted, fontSize: typography.micro, fontWeight: '600' },
  instruction: { marginTop: spacing.xl, paddingHorizontal: spacing.xl, color: colors.inkMuted, fontSize: typography.small, lineHeight: 20, textAlign: 'center' },
  emptyMark: { alignSelf: 'center', width: 104, height: 104, marginTop: 80, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.forestSoft, borderRadius: 36 },
  emptyKanji: { color: colors.forest, fontSize: 42, fontWeight: '800' },
  emptyTitle: { marginTop: spacing.xxl, color: colors.ink, fontSize: typography.display, fontWeight: '900', textAlign: 'center' },
  emptyBody: { marginTop: spacing.md, color: colors.inkMuted, fontSize: typography.body, lineHeight: 24, textAlign: 'center' },
  emptyStats: { marginTop: spacing.xxl, flexDirection: 'row', alignItems: 'center', padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line },
  emptyStat: { flex: 1, alignItems: 'center' },
  emptyValue: { color: colors.forest, fontSize: typography.title, fontWeight: '900' },
  emptyLabel: { color: colors.inkMuted, fontSize: typography.micro, fontWeight: '700' },
  emptyDivider: { width: 1, height: 36, backgroundColor: colors.line },
});
