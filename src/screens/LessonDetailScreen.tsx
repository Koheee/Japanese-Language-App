import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DialogueBubble } from '../components/DialogueBubble';
import { GrammarCard } from '../components/GrammarCard';
import { LessonQuickSwitcher } from '../components/LessonQuickSwitcher';
import { LessonReferenceSection } from '../components/LessonReferenceSection';
import { Screen } from '../components/Screen';
import { SearchButton } from '../components/SearchButton';
import { SearchTargetAnchor } from '../components/SearchTargetAnchor';
import { SectionTitle } from '../components/SectionTitle';
import { getLesson, lessons } from '../data/lessons';
import { LearnStackParamList } from '../navigation/types';
import {
  calculateSearchTargetY,
  resolveSearchLanding,
  shouldRunSearchLanding,
} from '../search/searchLandingController';
import { colors, radii, spacing, typography } from '../theme/tokens';

type Props = NativeStackScreenProps<LearnStackParamList, 'LessonDetail'>;
type Tab = 'overview' | 'grammar' | 'dialogue';

interface WebSearchTargetAnchor {
  focus?: () => void;
  scrollIntoView?: (options: { behavior: 'smooth'; block: 'start' }) => void;
}

const tabs: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'grammar', label: 'Grammar' },
  { id: 'dialogue', label: 'Dialogue' },
];

export function LessonDetailScreen({ navigation, route }: Props) {
  const searchTarget = route.params.searchTarget;
  const [activeTab, setActiveTab] = useState<Tab>(searchTarget?.tab ?? 'overview');
  const [focusedTab, setFocusedTab] = useState<Tab | null>(null);
  const [focusedGrammarId, setFocusedGrammarId] = useState<string | null>(null);
  const [tabTop, setTabTop] = useState<number | null>(null);
  const [dialogueListTop, setDialogueListTop] = useState<number | null>(null);
  const [searchTargetTop, setSearchTargetTop] = useState<number | null>(null);
  const [highlightedRequestToken, setHighlightedRequestToken] = useState<string | null>(null);
  const screenScrollRef = useRef<ScrollView>(null);
  const targetAnchorRef = useRef<View>(null);
  const consumedRequestTokenRef = useRef<string | null>(null);
  const lessonSwitcherFocusTargetRef = useRef<string | null>(null);
  const lesson = getLesson(route.params.lessonId);
  const landing = lesson && searchTarget ? resolveSearchLanding(lesson, searchTarget) : null;
  const targetY = searchTargetTop !== null && tabTop !== null
    && (searchTarget?.tab !== 'dialogue' || dialogueListTop !== null)
    ? calculateSearchTargetY({
        tabTop,
        listTop: searchTarget?.tab === 'dialogue' ? dialogueListTop ?? 0 : 0,
        targetTop: searchTargetTop,
      })
    : null;

  useEffect(() => {
    if (!shouldRunSearchLanding(consumedRequestTokenRef.current, searchTarget)) return;

    setActiveTab(searchTarget!.tab);
    setTabTop(null);
    setDialogueListTop(null);
    setSearchTargetTop(null);
    setHighlightedRequestToken(null);

    const fallbackTimer = setTimeout(() => {
      if (!shouldRunSearchLanding(consumedRequestTokenRef.current, searchTarget)) return;
      consumedRequestTokenRef.current = searchTarget!.requestToken;
      screenScrollRef.current?.scrollTo({ y: 0, animated: true });
    }, 2_000);

    return () => clearTimeout(fallbackTimer);
  }, [route.params.lessonId, searchTarget?.requestToken]);

  useEffect(() => {
    if (targetY === null || !shouldRunSearchLanding(consumedRequestTokenRef.current, searchTarget)) return;

    consumedRequestTokenRef.current = searchTarget!.requestToken;
    const webTargetAnchor = targetAnchorRef.current as unknown as WebSearchTargetAnchor | null;
    if (Platform.OS === 'web' && webTargetAnchor?.scrollIntoView) {
      webTargetAnchor.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    } else {
      screenScrollRef.current?.scrollTo({ y: targetY, animated: true });
    }
    setHighlightedRequestToken(searchTarget!.requestToken);

    const focusTimer = setTimeout(() => {
      const targetAnchor = targetAnchorRef.current;
      if (Platform.OS === 'web') {
        (targetAnchor as unknown as WebSearchTargetAnchor | null)?.focus?.();
        return;
      }
      const targetHandle = findNodeHandle(targetAnchor);
      if (targetHandle) AccessibilityInfo.setAccessibilityFocus(targetHandle);
    }, 350);
    const highlightTimer = setTimeout(() => {
      setHighlightedRequestToken((current) => current === searchTarget!.requestToken ? null : current);
    }, 2_500);

    return () => {
      clearTimeout(focusTimer);
      clearTimeout(highlightTimer);
    };
  }, [searchTarget?.requestToken, targetY]);

  if (!lesson) return null;

  const handleLessonSelect = (lessonId: string) => {
    lessonSwitcherFocusTargetRef.current = lessonId;
    navigation.setParams({ lessonId });
  };

  const handleGrammarMapActivate = () => {
    setActiveTab('grammar');
    screenScrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <Screen key={lesson.id} scroll contentStyle={styles.page} scrollRef={screenScrollRef}>
      <Pressable
        accessibilityHint="Returns to the list of lessons"
        accessibilityLabel="Back to all lessons"
        accessibilityRole="button"
        onPress={navigation.goBack}
        style={styles.back}
      >
        <Text style={styles.backText}>‹  All lessons</Text>
      </Pressable>

      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <View style={styles.lessonSeal}>
            <Text style={styles.sealText}>{String(lesson.number).padStart(2, '0')}</Text>
            <Text style={styles.sealKanji}>課</Text>
          </View>
          <View style={styles.heroMeta}>
            <Text style={styles.readyLabel}>
              LESSON {String(lesson.number).padStart(2, '0')} · {lesson.durationMinutes} MIN
            </Text>
            <Text style={styles.heroJapanese}>{lesson.japaneseTitle}</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>{lesson.title}</Text>
        <Text style={styles.heroDescription}>{lesson.description}</Text>
      </View>

      <LessonQuickSwitcher
        currentLessonId={lesson.id}
        focusOnMount={lessonSwitcherFocusTargetRef.current === lesson.id}
        lessons={lessons}
        onMountFocusHandled={() => {
          lessonSwitcherFocusTargetRef.current = null;
        }}
        onSelect={handleLessonSelect}
      />

      <SearchButton onPress={() => navigation.navigate('Search')} />

      <View accessibilityRole="tablist" style={styles.tabs}>
        {tabs.map((tab) => (
          <Pressable
            accessibilityHint={`Shows the lesson ${tab.label.toLowerCase()} tab`}
            accessibilityLabel={`${tab.label} tab`}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.id }}
            aria-selected={activeTab === tab.id}
            key={tab.id}
            onBlur={() => setFocusedTab((current) => current === tab.id ? null : current)}
            onFocus={() => setFocusedTab(tab.id)}
            onPress={() => setActiveTab(tab.id)}
            style={[
              styles.tab,
              activeTab === tab.id && styles.tabActive,
              focusedTab === tab.id && styles.tabFocused,
            ]}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'overview' ? (
        <View style={styles.tabContent}>
          <SectionTitle eyebrow={lesson.theme} title="What you’ll be able to do" />
          <View style={styles.goalList}>
            {lesson.goals.map((goal, index) => (
              <View key={goal} style={styles.goalRow}>
                <View style={styles.goalNumber}>
                  <Text style={styles.goalNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.goalText}>{goal}</Text>
              </View>
            ))}
          </View>

          <View style={styles.mentalModel}>
            <Text style={styles.mentalEyebrow}>THE CORE MENTAL SHIFT</Text>
            <Text style={styles.mentalTitle}>{lesson.grammar[0]?.title}</Text>
            <Text style={styles.mentalBody}>{lesson.grammar[0]?.whyItWorks}</Text>
          </View>

          <View style={styles.lessonMap}>
            <SectionTitle eyebrow="Lesson map" title="Grammar path" />
            <Text style={styles.sectionIntro}>
              Start with the shape of each pattern, then open Grammar for the full explanation.
            </Text>
            <View style={styles.grammarMapList}>
              {lesson.grammar.map((point, index) => (
                <Pressable
                  accessibilityLabel={`Open grammar ${index + 1}: ${point.title}`}
                  accessibilityRole="button"
                  key={point.id}
                  onBlur={() => setFocusedGrammarId((current) => current === point.id ? null : current)}
                  onFocus={() => setFocusedGrammarId(point.id)}
                  onPress={handleGrammarMapActivate}
                  style={[
                    styles.grammarMapRow,
                    focusedGrammarId === point.id && styles.grammarMapRowFocused,
                  ]}
                >
                  <Text style={styles.grammarMapPattern}>{point.pattern}</Text>
                  <Text style={styles.grammarMapMeaning}>{point.plainEnglish}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.atGlance}>
            <SectionTitle title="At a glance" />
            <View style={styles.statsRow}>
              <Stat value={lesson.grammar.length} label="patterns" />
              <Stat value={lesson.dialogue.length} label="dialogue lines" />
              <Stat value={lesson.theme} label="scenario" />
            </View>
          </View>
        </View>
      ) : null}

      {activeTab === 'grammar' ? (
        <View onLayout={(event) => setTabTop(event.nativeEvent.layout.y)} style={styles.tabContent}>
          <SectionTitle
            eyebrow="Meaning before memorising"
            title="Grammar lab"
            detail={`${lesson.grammar.length} patterns`}
          />
          <Text style={styles.sectionIntro}>
            Each pattern includes the English-speaker trap to watch for. Read the idea, say the examples,
            then compare the word order.
          </Text>
          {lesson.grammar.map((point, index) => {
            const isSearchTarget = Boolean(
              landing?.valid && searchTarget?.tab === 'grammar' && searchTarget.contentId === point.id,
            );
            return (
              <SearchTargetAnchor
                accessibilityLabel={`Search match in ${point.title}`}
                highlighted={isSearchTarget && highlightedRequestToken === searchTarget?.requestToken}
                key={point.id}
                onLayout={isSearchTarget
                  ? (event) => setSearchTargetTop(event.nativeEvent.layout.y)
                  : undefined}
                ref={isSearchTarget ? targetAnchorRef : undefined}
              >
                <GrammarCard
                  index={index}
                  key={point.id}
                  point={point}
                  searchLanding={isSearchTarget ? searchTarget : undefined}
                />
              </SearchTargetAnchor>
            );
          })}
          <LessonReferenceSection points={lesson.grammar} />
        </View>
      ) : null}

      {activeTab === 'dialogue' ? (
        <View onLayout={(event) => setTabTop(event.nativeEvent.layout.y)} style={styles.tabContent}>
          <SectionTitle eyebrow={lesson.theme} title="Dialogue in context" detail="Original dialogue" />
          <Text style={styles.sectionIntro}>
            Read the Japanese aloud once without the English. On the second pass, notice how the topic
            disappears when everyone already knows it.
          </Text>
          <View onLayout={(event) => setDialogueListTop(event.nativeEvent.layout.y)} style={styles.dialogueList}>
            {lesson.dialogue.map((turn, index) => {
              const isSearchTarget = Boolean(
                landing?.valid && searchTarget?.tab === 'dialogue' && searchTarget.contentId === turn.id,
              );
              return (
                <SearchTargetAnchor
                  accessibilityLabel={`Search match in ${turn.speaker}'s dialogue line`}
                  highlighted={isSearchTarget && highlightedRequestToken === searchTarget?.requestToken}
                  key={turn.id}
                  onLayout={isSearchTarget
                    ? (event) => setSearchTargetTop(event.nativeEvent.layout.y)
                    : undefined}
                  ref={isSearchTarget ? targetAnchorRef : undefined}
                >
                  <DialogueBubble
                    alignRight={index % 2 === 1}
                    grammar={lesson.grammar}
                    key={turn.id}
                    searchLanding={isSearchTarget ? searchTarget : undefined}
                    turn={turn}
                  />
                </SearchTargetAnchor>
              );
            })}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, typeof value === 'string' && styles.statContextValue]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    width: '100%',
    maxWidth: 840,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.huge,
  },
  back: {
    minHeight: 44,
    minWidth: 44,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingRight: spacing.lg,
  },
  backText: { color: colors.forest, fontSize: typography.small, fontWeight: '800' },
  hero: {
    marginTop: spacing.sm,
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.forest,
    borderRadius: radii.lg,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  lessonSeal: {
    width: 62,
    height: 62,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.coral,
    transform: [{ rotate: '-3deg' }],
  },
  sealText: { color: colors.white, fontSize: typography.micro, fontWeight: '900' },
  sealKanji: { color: colors.white, fontSize: typography.title, fontWeight: '700', lineHeight: 27 },
  heroMeta: { flex: 1, gap: spacing.xs },
  readyLabel: { color: colors.goldSoft, fontSize: typography.micro, fontWeight: '900', letterSpacing: 1.2 },
  heroJapanese: { color: colors.goldSoft, fontSize: typography.body, fontWeight: '700' },
  heroTitle: { color: colors.white, fontSize: typography.display, fontWeight: '900', letterSpacing: -1 },
  heroDescription: { color: colors.forestSoft, fontSize: typography.body, lineHeight: 25 },
  tabs: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    padding: spacing.xs,
    backgroundColor: colors.surfaceStrong,
    borderRadius: radii.md,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tabActive: { backgroundColor: colors.surface },
  tabFocused: { borderColor: colors.gold },
  tabText: { color: colors.inkMuted, fontSize: typography.micro, fontWeight: '800' },
  tabTextActive: { color: colors.forest },
  tabContent: { marginTop: spacing.xxl, gap: spacing.lg },
  sectionIntro: { marginTop: -spacing.sm, color: colors.inkMuted, fontSize: typography.small, lineHeight: 21 },
  goalList: { gap: spacing.sm },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  goalNumber: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.coralSoft,
  },
  goalNumberText: { color: colors.coral, fontSize: typography.small, fontWeight: '900' },
  goalText: { flex: 1, color: colors.ink, fontSize: typography.small, fontWeight: '600', lineHeight: 20 },
  mentalModel: {
    marginTop: spacing.sm,
    padding: spacing.xl,
    gap: spacing.sm,
    backgroundColor: colors.goldSoft,
    borderRadius: radii.lg,
  },
  mentalEyebrow: { color: colors.inkMuted, fontSize: typography.micro, fontWeight: '900', letterSpacing: 1.1 },
  mentalTitle: { color: colors.ink, fontSize: typography.heading, fontWeight: '800' },
  mentalBody: { color: colors.ink, fontSize: typography.small, lineHeight: 21 },
  lessonMap: { marginTop: spacing.sm, gap: spacing.lg },
  grammarMapList: { gap: spacing.sm },
  grammarMapRow: {
    minHeight: 44,
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.line,
  },
  grammarMapRowFocused: { borderColor: colors.gold },
  grammarMapPattern: { color: colors.coral, fontSize: typography.body, fontWeight: '800' },
  grammarMapMeaning: { color: colors.inkMuted, fontSize: typography.small, lineHeight: 20 },
  atGlance: { marginTop: spacing.sm, gap: spacing.lg },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: {
    minWidth: 96,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  statValue: { color: colors.forest, fontSize: typography.title, fontWeight: '900', textAlign: 'center' },
  statContextValue: { fontSize: typography.small, lineHeight: 19 },
  statLabel: { marginTop: spacing.xs, color: colors.inkMuted, fontSize: typography.micro, fontWeight: '700' },
  dialogueList: { gap: spacing.lg },
});
