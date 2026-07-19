import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { CompositionAwareTextInput } from '../components/CompositionAwareTextInput';
import { DialogueBubble } from '../components/DialogueBubble';
import { GrammarCard } from '../components/GrammarCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { ProgressBar } from '../components/ProgressBar';
import { Screen } from '../components/Screen';
import { SectionTitle } from '../components/SectionTitle';
import { getLessonOutline } from '../data/curriculum';
import { getLesson } from '../data/lessons';
import {
  LearnStackParamList,
  RootStackParamList,
  RootTabParamList,
} from '../navigation/types';
import { createActionLock } from '../state/appStateCommitter';
import { useStudy } from '../state/StudyContext';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { buildLessonWordsView } from './lessonWordsModel';
import { runRouteUiAction } from './routeUiLifecycle';
import { useRouteUiLifecycle } from './useRouteUiLifecycle';

type Props = CompositeScreenProps<
  NativeStackScreenProps<LearnStackParamList, 'LessonDetail'>,
  CompositeScreenProps<
    BottomTabScreenProps<RootTabParamList, 'Learn'>,
    NativeStackScreenProps<RootStackParamList, 'MainTabs'>
  >
>;
type Tab = 'overview' | 'grammar' | 'words' | 'dialogue';

const tabs: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'grammar', label: 'Grammar' },
  { id: 'words', label: 'Words' },
  { id: 'dialogue', label: 'Dialogue' },
];

export function LessonDetailScreen({ navigation, route }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [draftQuery, setDraftQuery] = useState('');
  const [committedQuery, setCommittedQuery] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const startLockRef = useRef<ReturnType<typeof createActionLock> | null>(null);
  const startLock = startLockRef.current ??= createActionLock();
  const routeUiLifecycle = useRouteUiLifecycle(navigation);
  const { startLesson, getProgress, state } = useStudy();
  const lesson = getLesson(route.params.lessonId);
  const outline = getLessonOutline(route.params.lessonId);
  const progress = getProgress(route.params.lessonId);

  const completion = useMemo(
    () => lesson && progress ? progress.completedExerciseIds.length / lesson.exercises.length : 0,
    [lesson, progress],
  );
  const wordsView = useMemo(
    () => lesson
      ? buildLessonWordsView({ lesson, vocabulary: state.vocabulary, query: committedQuery })
      : null,
    [committedQuery, lesson, state.vocabulary],
  );

  if (!outline) return null;

  if (!lesson) {
    return (
      <Screen scroll contentStyle={styles.page}>
        <Pressable
          accessibilityHint="Returns to the list of lessons"
          accessibilityLabel="Back to all lessons"
          accessibilityRole="button"
          onPress={navigation.goBack}
          style={styles.back}
        >
          <Text style={styles.backText}>‹  All lessons</Text>
        </Pressable>
        <View style={styles.outlineHero}>
          <Text style={styles.outlineNumber}>LESSON {String(outline.number).padStart(2, '0')} · CURRICULUM OUTLINE</Text>
          <Text style={styles.heroJapanese}>{outline.japaneseTitle}</Text>
          <Text style={styles.heroTitle}>{outline.title}</Text>
          <Text style={styles.heroDescription}>{outline.summary}</Text>
        </View>

        <View style={styles.outlineSection}>
          <SectionTitle eyebrow="Language targets" title="Grammar focus" />
          <View style={styles.chips}>
            {outline.grammarFocus.map((focus) => <View key={focus} style={styles.chip}><Text style={styles.chipText}>{focus}</Text></View>)}
          </View>
        </View>

        <View style={styles.outlineSection}>
          <SectionTitle eyebrow="Word field" title="Vocabulary theme" />
          <View style={styles.themeCard}>
            <Text style={styles.themeGlyph}>言</Text>
            <Text style={styles.themeText}>{outline.vocabularyTheme}</Text>
          </View>
        </View>

        <View style={styles.previewNotice}>
          <Text style={styles.previewTitle}>Mapped for the full journey</Text>
          <Text style={styles.previewBody}>This lesson’s learning targets are part of the 25-step curriculum. Its full original teaching content will follow the same grammar → examples → dialogue → practice flow as Lesson 1.</Text>
        </View>
      </Screen>
    );
  }

  const beginPractice = async () => {
    const work = startLock.tryRun(async () => {
      setIsStarting(true);
      await runRouteUiAction(
        routeUiLifecycle,
        () => startLesson(lesson.id),
        (outcome) => {
          if (outcome.status === 'fulfilled' && outcome.value.ok) {
            navigation.navigate('Exercise', { lessonId: lesson.id });
          }
        },
        () => setIsStarting(false),
      );
    });
    if (work) await work;
  };

  const lessonHeader = (
    <>
      <Pressable
        accessibilityHint="Returns to the list of lessons"
        accessibilityLabel="Back to all lessons"
        accessibilityRole="button"
        onPress={navigation.goBack}
        style={styles.back}
      >
        <Text style={styles.backText}>‹  All lessons</Text>
      </Pressable>

      <View style={styles.readyHero}>
        <View style={styles.heroTopRow}>
          <View style={styles.lessonSeal}><Text style={styles.sealText}>{String(lesson.number).padStart(2, '0')}</Text><Text style={styles.sealKanji}>課</Text></View>
          <View style={styles.heroMeta}>
            <Text style={styles.readyLabel}>LESSON {String(lesson.number).padStart(2, '0')} · {lesson.durationMinutes} MIN</Text>
            <Text style={styles.heroJapanese}>{lesson.japaneseTitle}</Text>
          </View>
        </View>
        <Text style={[styles.heroTitle, styles.readyHeroTitle]}>{lesson.title}</Text>
        <Text style={[styles.heroDescription, styles.readyHeroDescription]}>{lesson.description}</Text>
        <View style={styles.heroProgress}>
          <ProgressBar value={completion} accent={colors.gold} />
          <Text style={styles.heroProgressText}>{completion ? `${Math.round(completion * 100)}% practised` : 'A clean page — begin when ready'}</Text>
        </View>
      </View>

      <View accessibilityRole="tablist" style={styles.tabs}>
        {tabs.map((tab) => (
          <Pressable
            accessibilityHint={`Shows the lesson ${tab.label.toLowerCase()} tab`}
            accessibilityLabel={`${tab.label} tab`}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.id }}
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>
    </>
  );

  const practiceFooter = (
    <View style={styles.practiceFooter}>
      <View>
        <Text style={styles.practiceEyebrow}>READY TO RETRIEVE?</Text>
        <Text style={styles.practiceTitle}>{progress?.started ? 'Continue your practice' : 'Make it stick'}</Text>
      </View>
      <PrimaryButton
        label={isStarting ? 'Saving…' : progress?.started ? 'Continue exercises' : `Start ${lesson.exercises.length} exercises`}
        disabled={isStarting}
        onPress={beginPractice}
      />
    </View>
  );

  if (activeTab === 'words' && wordsView) {
    const lessonNumber = String(lesson.number).padStart(2, '0');

    return (
      <Screen contentStyle={styles.wordsScreen}>
        <FlatList
          contentContainerStyle={styles.wordsListContent}
          data={wordsView.filtered}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          keyExtractor={({ item }) => item.id}
          ListEmptyComponent={(
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {wordsView.emptyState === 'no-matches'
                  ? 'No words match this search.'
                  : 'No words are visible in this lesson.'}
              </Text>
            </View>
          )}
          ListFooterComponent={practiceFooter}
          ListHeaderComponent={(
            <View>
              {lessonHeader}
              <View style={styles.wordsControls}>
                <SectionTitle eyebrow={lesson.theme} title="Word shelf" />
                <Text style={styles.sectionIntro}>Read the Japanese first, then check the smaller pronunciation line. Every item enters review when you begin practice.</Text>
                <CompositionAwareTextInput
                  accessibilityHint="Matches Japanese, kana reading, English, or category"
                  accessibilityLabel={`Search Lesson ${lessonNumber} words`}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onCommittedChange={setCommittedQuery}
                  onDraftChange={setDraftQuery}
                  placeholder="Search words"
                  returnKeyType="search"
                  style={styles.searchInput}
                  value={draftQuery}
                />
                <View style={styles.wordsToolbar}>
                  <Text accessibilityLiveRegion="polite" style={styles.visibleCount}>
                    {`${wordsView.visibleCount} visible words`}
                  </Text>
                  <Pressable
                    accessibilityHint="Opens this lesson's vocabulary manager"
                    accessibilityLabel="Manage lesson words"
                    accessibilityRole="button"
                    onPress={() => navigation.navigate('VocabularyManager', { lessonId: lesson.id })}
                    style={({ pressed }) => [styles.manageButton, pressed && styles.manageButtonPressed]}
                  >
                    <Text style={styles.manageButtonText}>Manage words</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
          renderItem={({ item: resolved }) => {
            const word = resolved.item;
            return (
              <View style={styles.wordRow}>
                <View style={styles.wordJapanese}>
                  <Text style={styles.wordMain}>{word.japanese}</Text>
                  <Text style={styles.wordReading}>{word.reading}</Text>
                </View>
                <View style={styles.wordMeaning}>
                  <Text style={styles.wordEnglish}>{word.english}</Text>
                  <Text style={styles.wordKind}>{word.partOfSpeech}</Text>
                  {word.category ? <Text style={styles.wordCategory}>{word.category}</Text> : null}
                  {word.note ? <Text style={styles.wordNote}>{word.note}</Text> : null}
                </View>
              </View>
            );
          }}
          showsVerticalScrollIndicator={false}
          style={styles.wordsFlatList}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll contentStyle={styles.page}>
      {lessonHeader}

      {activeTab === 'overview' ? (
        <View style={styles.tabContent}>
          <SectionTitle eyebrow={lesson.theme} title="What you’ll be able to do" />
          <View style={styles.goalList}>
            {lesson.goals.map((goal, index) => (
              <View key={goal} style={styles.goalRow}>
                <View style={styles.goalNumber}><Text style={styles.goalNumberText}>{index + 1}</Text></View>
                <Text style={styles.goalText}>{goal}</Text>
              </View>
            ))}
          </View>

          <View style={styles.mentalModel}>
            <Text style={styles.mentalEyebrow}>THE CORE MENTAL SHIFT</Text>
            <Text style={styles.mentalTitle}>{lesson.grammar[0]?.title}</Text>
            <Text style={styles.mentalBody}>{lesson.grammar[0]?.whyItWorks}</Text>
            <Pressable onPress={() => setActiveTab('grammar')}><Text style={styles.mentalLink}>Explore the grammar  →</Text></Pressable>
          </View>

          <View style={styles.atGlance}>
            <SectionTitle title="At a glance" />
            <View style={styles.statsRow}>
              <Stat value={lesson.grammar.length} label="patterns" />
              <Stat value={lesson.vocabulary.length} label="words" />
              <Stat value={lesson.dialogue.length} label="lines" />
              <Stat value={lesson.exercises.length} label="drills" />
            </View>
          </View>
        </View>
      ) : null}

      {activeTab === 'grammar' ? (
        <View style={styles.tabContent}>
          <SectionTitle eyebrow="Meaning before memorising" title="Grammar lab" detail={`${lesson.grammar.length} patterns`} />
          <Text style={styles.sectionIntro}>Each pattern includes the English-speaker trap to watch for. Read the idea, say the examples, then compare the word order.</Text>
          {lesson.grammar.map((point, index) => <GrammarCard key={point.id} point={point} index={index} />)}
        </View>
      ) : null}

      {activeTab === 'dialogue' ? (
        <View style={styles.tabContent}>
          <SectionTitle eyebrow={lesson.theme} title="Dialogue in context" detail="Original dialogue" />
          <Text style={styles.sectionIntro}>Read the Japanese aloud once without the English. On the second pass, notice how the topic disappears when everyone already knows it.</Text>
          <View style={styles.dialogueList}>
            {lesson.dialogue.map((turn, index) => <DialogueBubble key={turn.id} turn={turn} alignRight={index % 2 === 1} />)}
          </View>
        </View>
      ) : null}

      {practiceFooter}
    </Screen>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.huge },
  wordsScreen: { flex: 1 },
  wordsFlatList: { flex: 1 },
  wordsListContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.huge },
  back: { minHeight: 44, minWidth: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingRight: spacing.lg },
  backText: { color: colors.forest, fontSize: typography.small, fontWeight: '800' },
  readyHero: { marginTop: spacing.sm, padding: spacing.xl, gap: spacing.md, backgroundColor: colors.forest, borderRadius: radii.lg },
  outlineHero: { marginTop: spacing.sm, paddingVertical: spacing.xl, gap: spacing.sm },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  lessonSeal: { width: 62, height: 62, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.coral, transform: [{ rotate: '-3deg' }] },
  sealText: { color: colors.white, fontSize: typography.micro, fontWeight: '900' },
  sealKanji: { color: colors.white, fontSize: typography.title, fontWeight: '700', lineHeight: 27 },
  heroMeta: { flex: 1, gap: spacing.xs },
  readyLabel: { color: colors.goldSoft, fontSize: typography.micro, fontWeight: '900', letterSpacing: 1.2 },
  outlineNumber: { color: colors.coral, fontSize: typography.micro, fontWeight: '900', letterSpacing: 1.2 },
  heroJapanese: { color: colors.goldSoft, fontSize: typography.body, fontWeight: '700' },
  heroTitle: { color: colors.ink, fontSize: typography.display, fontWeight: '900', letterSpacing: -1 },
  readyHeroTitle: { color: colors.white },
  readyHeroDescription: { color: colors.forestSoft },
  heroDescription: { color: colors.inkMuted, fontSize: typography.body, lineHeight: 25 },
  heroProgress: { marginTop: spacing.sm, gap: spacing.sm },
  heroProgressText: { color: colors.forestSoft, fontSize: typography.micro, fontWeight: '700' },
  tabs: { marginTop: spacing.lg, flexDirection: 'row', padding: spacing.xs, backgroundColor: colors.surfaceStrong, borderRadius: radii.md },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm, borderRadius: radii.sm },
  tabActive: { backgroundColor: colors.surface },
  tabText: { color: colors.inkMuted, fontSize: typography.micro, fontWeight: '800' },
  tabTextActive: { color: colors.forest },
  tabContent: { marginTop: spacing.xxl, gap: spacing.lg },
  sectionIntro: { marginTop: -spacing.sm, color: colors.inkMuted, fontSize: typography.small, lineHeight: 21 },
  goalList: { gap: spacing.sm },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line },
  goalNumber: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.coralSoft },
  goalNumberText: { color: colors.coral, fontSize: typography.small, fontWeight: '900' },
  goalText: { flex: 1, color: colors.ink, fontSize: typography.small, fontWeight: '600', lineHeight: 20 },
  mentalModel: { marginTop: spacing.sm, padding: spacing.xl, gap: spacing.sm, backgroundColor: colors.goldSoft, borderRadius: radii.lg },
  mentalEyebrow: { color: colors.inkMuted, fontSize: typography.micro, fontWeight: '900', letterSpacing: 1.1 },
  mentalTitle: { color: colors.ink, fontSize: typography.heading, fontWeight: '800' },
  mentalBody: { color: colors.ink, fontSize: typography.small, lineHeight: 21 },
  mentalLink: { marginTop: spacing.xs, color: colors.forest, fontSize: typography.small, fontWeight: '800' },
  atGlance: { marginTop: spacing.sm, gap: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing.lg, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line },
  statValue: { color: colors.forest, fontSize: typography.title, fontWeight: '900' },
  statLabel: { color: colors.inkMuted, fontSize: typography.micro, fontWeight: '700' },
  wordsControls: { marginTop: spacing.xxl, marginBottom: spacing.lg, gap: spacing.lg },
  searchInput: { minHeight: 48, paddingHorizontal: spacing.lg, color: colors.ink, fontSize: typography.body, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line },
  wordsToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  visibleCount: { flexShrink: 1, color: colors.inkMuted, fontSize: typography.small, fontWeight: '700' },
  manageButton: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, backgroundColor: colors.forestSoft, borderRadius: radii.md },
  manageButtonPressed: { opacity: 0.82 },
  manageButtonText: { color: colors.forest, fontSize: typography.small, fontWeight: '800' },
  wordRow: { flexDirection: 'row', marginBottom: -1, padding: spacing.lg, gap: spacing.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  wordJapanese: { width: '38%' },
  wordMain: { color: colors.ink, fontSize: typography.body, fontWeight: '800' },
  wordReading: { marginTop: 2, color: colors.forest, fontSize: typography.micro },
  wordMeaning: { flex: 1, gap: 2 },
  wordEnglish: { color: colors.ink, fontSize: typography.small, fontWeight: '700' },
  wordKind: { color: colors.coral, fontSize: typography.micro, fontWeight: '700', textTransform: 'uppercase' },
  wordCategory: { color: colors.forest, fontSize: typography.micro, fontWeight: '700' },
  wordNote: { marginTop: spacing.xs, color: colors.inkMuted, fontSize: typography.micro, lineHeight: 16 },
  emptyState: { marginTop: spacing.sm, padding: spacing.xl, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line },
  emptyStateText: { color: colors.inkMuted, fontSize: typography.small, lineHeight: 21, textAlign: 'center' },
  dialogueList: { gap: spacing.lg },
  practiceFooter: { marginTop: spacing.xxl, padding: spacing.xl, gap: spacing.lg, backgroundColor: colors.coralSoft, borderRadius: radii.lg },
  practiceEyebrow: { color: colors.coral, fontSize: typography.micro, fontWeight: '900', letterSpacing: 1.1 },
  practiceTitle: { marginTop: spacing.xs, color: colors.ink, fontSize: typography.title, fontWeight: '800' },
  outlineSection: { marginTop: spacing.xl, gap: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.forestSoft, borderRadius: radii.pill },
  chipText: { color: colors.forest, fontSize: typography.small, fontWeight: '700' },
  themeCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line },
  themeGlyph: { color: colors.coral, fontSize: typography.display, fontWeight: '800' },
  themeText: { flex: 1, color: colors.ink, fontSize: typography.body, lineHeight: 24, fontWeight: '600' },
  previewNotice: { marginTop: spacing.xxl, padding: spacing.xl, gap: spacing.sm, backgroundColor: colors.goldSoft, borderRadius: radii.lg },
  previewTitle: { color: colors.ink, fontSize: typography.heading, fontWeight: '800' },
  previewBody: { color: colors.inkMuted, fontSize: typography.small, lineHeight: 21 },
});
