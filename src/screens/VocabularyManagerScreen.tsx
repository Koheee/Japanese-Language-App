import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompositionAwareTextInput } from '../components/CompositionAwareTextInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { UndoSnackbar } from '../components/UndoSnackbar';
import { getLesson } from '../data/lessons';
import { RootStackParamList } from '../navigation/types';
import {
  filterResolvedVocabulary,
  resolveVocabularyLists,
} from '../services/vocabularyResolver';
import { createActionLock } from '../state/appStateCommitter';
import { useStudy } from '../state/StudyContext';
import {
  initialVocabularyManagerUiState,
  reduceVocabularyManagerUi,
} from '../state/vocabularyManagerUi';
import { colors, radii, spacing, typography } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'VocabularyManager'>;

export function VocabularyManagerScreen({ navigation, route }: Props) {
  const [ui, dispatch] = useReducer(
    reduceVocabularyManagerUi,
    initialVocabularyManagerUiState,
  );
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const actionLockRef = useRef<ReturnType<typeof createActionLock> | null>(null);
  const actionLock = actionLockRef.current ??= createActionLock();
  const {
    state,
    hideVocabulary,
    restoreVocabulary,
    undoVocabularyMutation,
  } = useStudy();
  const lesson = getLesson(route.params.lessonId);
  const lists = useMemo(
    () => lesson ? resolveVocabularyLists({ lesson, vocabulary: state.vocabulary }) : null,
    [lesson, state.vocabulary],
  );
  const selectedItems = ui.view === 'active' ? lists?.active : lists?.hidden;
  const filteredItems = useMemo(
    () => filterResolvedVocabulary(selectedItems ?? [], ui.appliedQuery),
    [selectedItems, ui.appliedQuery],
  );

  useEffect(
    () => navigation.addListener('blur', () => dispatch({ type: 'route-blurred' })),
    [navigation],
  );

  useEffect(() => {
    if (!ui.undoToken) return undefined;
    const timer = setTimeout(() => dispatch({ type: 'route-blurred' }), 6_000);
    return () => clearTimeout(timer);
  }, [ui.undoToken]);

  if (!lesson || !lists) {
    return (
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safe}>
        <View style={styles.missingLesson}>
          <Text accessibilityRole="alert" style={styles.errorText}>This lesson was not found.</Text>
          <PrimaryButton
            accessibilityHint="Returns to the previous screen"
            label="Back"
            onPress={navigation.goBack}
            variant="secondary"
          />
        </View>
      </SafeAreaView>
    );
  }

  const runReversibleMutation = async (vocabularyId: string, action: 'hide' | 'restore') => {
    const work = actionLock.tryRun(async () => {
      setPendingAction(vocabularyId);
      setMutationError(null);
      try {
        const result = action === 'hide'
          ? await hideVocabulary(lesson.id, vocabularyId)
          : await restoreVocabulary(lesson.id, vocabularyId);
        if (result.ok) {
          dispatch({ type: 'reversible-mutation-succeeded', token: result.undoToken });
        } else {
          setMutationError(result.error.message);
        }
      } catch (cause) {
        setMutationError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setPendingAction(null);
      }
    });
    if (work) await work;
  };

  const undoLatestMutation = async () => {
    const token = ui.undoToken;
    if (!token) return;
    const work = actionLock.tryRun(async () => {
      setPendingAction('undo');
      setMutationError(null);
      try {
        const result = await undoVocabularyMutation(token);
        if (result.ok) {
          dispatch({ type: 'undo-succeeded' });
        } else {
          setMutationError(result.error.message);
        }
      } catch (cause) {
        setMutationError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setPendingAction(null);
      }
    });
    if (work) await work;
  };

  const lessonNumber = String(lesson.number).padStart(2, '0');
  const hasSearch = ui.appliedQuery.trim().length > 0;
  const emptyMessage = hasSearch
    ? 'No words match this search.'
    : ui.view === 'hidden'
      ? 'No hidden words in this lesson.'
      : 'No active words in this lesson.';

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safe}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={filteredItems}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={({ item }) => item.id}
        ListEmptyComponent={(
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          </View>
        )}
        ListHeaderComponent={(
          <View style={styles.header}>
            <Pressable
              accessibilityHint="Returns to the lesson words tab"
              accessibilityLabel={`Back to Lesson ${lessonNumber}`}
              accessibilityRole="button"
              onPress={navigation.goBack}
              style={styles.back}
            >
              <Text style={styles.backText}>‹  Lesson words</Text>
            </Pressable>

            <View style={styles.hero}>
              <Text style={styles.eyebrow}>LESSON {lessonNumber} · WORD MANAGER</Text>
              <Text accessibilityRole="header" style={styles.title}>{lesson.title}</Text>
              <Text style={styles.japaneseTitle}>{lesson.japaneseTitle}</Text>
            </View>

            <PrimaryButton
              accessibilityHint={`Adds a personal word to Lesson ${lesson.number}`}
              accessibilityLabel={`Add word to Lesson ${lesson.number}`}
              label="Add word"
              onPress={() => navigation.navigate('WordEditor', { lessonId: lesson.id })}
            />

            <View accessibilityRole="tablist" style={styles.tabs}>
              <Pressable
                accessibilityHint="Shows words currently included in this lesson and due review"
                accessibilityLabel={`Active words, ${lists.active.length}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: ui.view === 'active' }}
                onPress={() => dispatch({ type: 'set-view', view: 'active' })}
                style={[styles.tab, ui.view === 'active' && styles.tabActive]}
              >
                <Text style={[styles.tabText, ui.view === 'active' && styles.tabTextActive]}>
                  Active ({lists.active.length})
                </Text>
              </Pressable>
              <Pressable
                accessibilityHint="Shows words hidden from this lesson and due review"
                accessibilityLabel={`Hidden words, ${lists.hidden.length}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: ui.view === 'hidden' }}
                onPress={() => dispatch({ type: 'set-view', view: 'hidden' })}
                style={[styles.tab, ui.view === 'hidden' && styles.tabActive]}
              >
                <Text style={[styles.tabText, ui.view === 'hidden' && styles.tabTextActive]}>
                  Hidden ({lists.hidden.length})
                </Text>
              </Pressable>
            </View>

            <View style={styles.searchGroup}>
              <Text style={styles.label}>Search words</Text>
              <CompositionAwareTextInput
                accessibilityHint="Matches Japanese, kana reading, English, or category in the selected view"
                accessibilityLabel={`Search Lesson ${lessonNumber} ${ui.view} words`}
                autoCapitalize="none"
                autoCorrect={false}
                onCommittedChange={(query) => dispatch({ type: 'commit-query', query })}
                onDraftChange={(query) => dispatch({ type: 'set-draft-query', query })}
                placeholder="Japanese, kana, English, or category"
                returnKeyType="search"
                style={styles.searchInput}
                value={ui.draftQuery}
              />
            </View>

            {mutationError ? (
              <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.errorText}>
                {mutationError}
              </Text>
            ) : null}
          </View>
        )}
        renderItem={({ item: resolved }) => {
          const word = resolved.item;
          const actionPending = pendingAction !== null;
          return (
            <View style={styles.wordCard}>
              <View style={styles.wordCopy}>
                <Text style={styles.wordJapanese}>{word.japanese}</Text>
                <Text style={styles.wordReading}>{word.reading}</Text>
                <Text style={styles.wordEnglish}>{word.english}</Text>
                {word.category ? <Text style={styles.wordCategory}>{word.category}</Text> : null}
              </View>
              <View style={styles.actions}>
                {resolved.editable ? (
                  <PrimaryButton
                    accessibilityHint={`Opens ${word.japanese} for editing`}
                    accessibilityLabel={`Edit ${word.japanese}`}
                    disabled={actionPending}
                    label="Edit"
                    onPress={() => navigation.navigate('WordEditor', {
                      lessonId: lesson.id,
                      vocabularyId: word.id,
                    })}
                    style={styles.actionButton}
                    variant="secondary"
                  />
                ) : null}
                {ui.view === 'active' ? (
                  <PrimaryButton
                    accessibilityHint="Removes this word from lesson and due review without deleting its schedule"
                    accessibilityLabel={`Hide ${word.japanese}`}
                    disabled={actionPending}
                    label={pendingAction === word.id ? 'Saving…' : 'Hide'}
                    onPress={() => runReversibleMutation(word.id, 'hide')}
                    style={styles.actionButton}
                    variant="text"
                  />
                ) : (
                  <PrimaryButton
                    accessibilityHint="Returns this word to the lesson and due review with its schedule intact"
                    accessibilityLabel={`Restore ${word.japanese}`}
                    disabled={actionPending}
                    label={pendingAction === word.id ? 'Saving…' : 'Restore'}
                    onPress={() => runReversibleMutation(word.id, 'restore')}
                    style={styles.actionButton}
                    variant="text"
                  />
                )}
              </View>
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
        style={styles.list}
      />
      {ui.undoToken ? (
        <UndoSnackbar
          disabled={pendingAction !== null}
          mutation={ui.undoToken.kind === 'restore' ? 'hidden' : 'restored'}
          onUndo={undoLatestMutation}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  header: { gap: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  back: {
    minHeight: 44,
    minWidth: 44,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingRight: spacing.lg,
  },
  backText: { color: colors.forest, fontSize: typography.small, fontWeight: '800' },
  hero: { gap: spacing.xs },
  eyebrow: { color: colors.coral, fontSize: typography.micro, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: typography.display, fontWeight: '900', letterSpacing: -1 },
  japaneseTitle: { color: colors.forest, fontSize: typography.body, fontWeight: '700' },
  tabs: {
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
    borderRadius: radii.sm,
  },
  tabActive: { backgroundColor: colors.surface },
  tabText: { color: colors.inkMuted, fontSize: typography.small, fontWeight: '800' },
  tabTextActive: { color: colors.forest },
  searchGroup: { gap: spacing.sm },
  label: { color: colors.ink, fontSize: typography.small, fontWeight: '800' },
  searchInput: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    color: colors.ink,
    fontSize: typography.body,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  errorText: { color: colors.error, fontSize: typography.small, fontWeight: '700', lineHeight: 20 },
  wordCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  wordCopy: { gap: 2 },
  wordJapanese: { color: colors.ink, fontSize: typography.heading, fontWeight: '900' },
  wordReading: { color: colors.forest, fontSize: typography.small },
  wordEnglish: { marginTop: spacing.xs, color: colors.ink, fontSize: typography.small, fontWeight: '700' },
  wordCategory: { color: colors.coral, fontSize: typography.micro, fontWeight: '800' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionButton: { minHeight: 44, flexGrow: 1, paddingHorizontal: spacing.lg },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyText: { color: colors.inkMuted, fontSize: typography.small, textAlign: 'center' },
  missingLesson: { flex: 1, justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
});
