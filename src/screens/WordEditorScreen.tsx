import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompositionAwareTextInput } from '../components/CompositionAwareTextInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { getLesson } from '../data/lessons';
import { RootStackParamList } from '../navigation/types';
import { VocabularyDraft } from '../services/vocabularyMutations';
import { resolveVocabularyLists } from '../services/vocabularyResolver';
import { createActionLock } from '../state/appStateCommitter';
import { useStudy } from '../state/StudyContext';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { buildWordEditorValidation } from './wordEditorModel';
import { runRouteUiAction } from './routeUiLifecycle';
import { useRouteUiLifecycle } from './useRouteUiLifecycle';

type Props = NativeStackScreenProps<RootStackParamList, 'WordEditor'>;

const emptyDraft = (): VocabularyDraft => ({
  japanese: '',
  reading: '',
  english: '',
  category: '',
});

export function WordEditorScreen({ navigation, route }: Props) {
  const { state, addVocabulary, editVocabulary } = useStudy();
  const lesson = getLesson(route.params.lessonId);
  const editingId = route.params.vocabularyId;
  const resolvedEditingItem = useMemo(
    () => lesson && editingId
      ? resolveVocabularyLists({ lesson, vocabulary: state.vocabulary })
        .all.find(({ item }) => item.id === editingId)
      : undefined,
    [editingId, lesson, state.vocabulary],
  );
  const initialDraft = resolvedEditingItem
    ? {
      japanese: resolvedEditingItem.item.japanese,
      reading: resolvedEditingItem.item.reading,
      english: resolvedEditingItem.item.english,
      category: resolvedEditingItem.item.category ?? '',
    }
    : emptyDraft();
  const [draft, setDraft] = useState<VocabularyDraft>(initialDraft);
  const [committedJapanese, setCommittedJapanese] = useState(initialDraft.japanese);
  const [committedReading, setCommittedReading] = useState(initialDraft.reading);
  const [japaneseComposing, setJapaneseComposing] = useState(false);
  const [readingComposing, setReadingComposing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);
  const saveLockRef = useRef<ReturnType<typeof createActionLock> | null>(null);
  const saveLock = saveLockRef.current ??= createActionLock();
  const routeUiLifecycle = useRouteUiLifecycle(navigation);
  const cannotEdit = !lesson
    || (editingId !== undefined && (!resolvedEditingItem || !resolvedEditingItem.editable));
  const composing = japaneseComposing || readingComposing;
  const validationDraft = useMemo(
    () => ({ ...draft, reading: committedReading }),
    [committedReading, draft],
  );
  const validation = useMemo(
    () => lesson && !cannotEdit
      ? buildWordEditorValidation({
        draft: validationDraft,
        committedJapanese,
        lesson,
        vocabulary: state.vocabulary,
        editingId,
        composing,
      })
      : null,
    [
      cannotEdit,
      committedJapanese,
      composing,
      editingId,
      lesson,
      state.vocabulary,
      validationDraft,
    ],
  );

  const updateDraft = (field: keyof VocabularyDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setWriteError(null);
  };

  const save = async () => {
    if (!lesson || !validation?.canSave) return;
    const work = saveLock.tryRun(async () => {
      setIsSaving(true);
      setWriteError(null);
      await runRouteUiAction(
        routeUiLifecycle,
        () => editingId
          ? editVocabulary(lesson.id, editingId, validation.normalizedDraft)
          : addVocabulary(lesson.id, validation.normalizedDraft),
        (outcome) => {
          if (outcome.status === 'rejected') {
            setWriteError(outcome.error instanceof Error
              ? outcome.error.message
              : String(outcome.error));
          } else if (outcome.value.ok) {
            navigation.goBack();
          } else {
            setWriteError(outcome.value.error.message);
          }
        },
        () => setIsSaving(false),
      );
    });
    if (work) await work;
  };

  if (cannotEdit || !lesson || !validation) {
    return (
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safe}>
        <View style={styles.unavailable}>
          <Text accessibilityRole="header" style={styles.title}>Word editor</Text>
          <Text accessibilityRole="alert" style={styles.errorText}>This word cannot be edited.</Text>
          <PrimaryButton
            accessibilityHint="Closes the word editor without making changes"
            accessibilityLabel="Cancel word editing"
            label="Cancel"
            onPress={navigation.goBack}
            variant="secondary"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>
              LESSON {String(lesson.number).padStart(2, '0')} · {editingId ? 'EDIT WORD' : 'ADD WORD'}
            </Text>
            <Text accessibilityRole="header" style={styles.title}>
              {editingId ? 'Edit your word' : 'Add a word'}
            </Text>
            <Text style={styles.subtitle}>{lesson.title}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Japanese</Text>
            <CompositionAwareTextInput
              accessibilityHint="Enter the Japanese headword"
              accessibilityLabel="Japanese"
              autoCapitalize="none"
              autoCorrect={false}
              onCommittedChange={(value) => {
                updateDraft('japanese', value);
                setCommittedJapanese(value);
                setJapaneseComposing(false);
              }}
              onCompositionChange={setJapaneseComposing}
              onDraftChange={(value) => {
                updateDraft('japanese', value);
                setJapaneseComposing(true);
              }}
              returnKeyType="next"
              style={styles.input}
              value={draft.japanese}
            />
            {validation.japaneseError ? (
              <Text accessibilityRole="alert" style={styles.errorText}>{validation.japaneseError}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Kana reading</Text>
            <CompositionAwareTextInput
              accessibilityHint="Enter the pronunciation using hiragana or katakana"
              accessibilityLabel="Kana reading"
              autoCapitalize="none"
              autoCorrect={false}
              onCommittedChange={(value) => {
                updateDraft('reading', value);
                setCommittedReading(value);
                setReadingComposing(false);
              }}
              onCompositionChange={setReadingComposing}
              onDraftChange={(value) => {
                updateDraft('reading', value);
                setReadingComposing(true);
              }}
              returnKeyType="next"
              style={styles.input}
              value={draft.reading}
            />
            {validation.readingError ? (
              <Text accessibilityRole="alert" style={styles.errorText}>{validation.readingError}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>English meaning</Text>
            <TextInput
              accessibilityHint="Enter the English meaning"
              accessibilityLabel="English meaning"
              autoCapitalize="sentences"
              onChangeText={(value) => updateDraft('english', value)}
              returnKeyType="next"
              style={styles.input}
              value={draft.english}
            />
            {validation.englishError ? (
              <Text accessibilityRole="alert" style={styles.errorText}>{validation.englishError}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Optional category</Text>
            <TextInput
              accessibilityHint="Optionally group this word by topic or word type"
              accessibilityLabel="Optional category"
              autoCapitalize="sentences"
              onChangeText={(value) => updateDraft('category', value)}
              returnKeyType="done"
              style={styles.input}
              value={draft.category ?? ''}
            />
          </View>

          {validation.duplicateError ? (
            <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.errorBox}>
              {validation.duplicateError}
            </Text>
          ) : null}
          {writeError ? (
            <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.errorBox}>
              {writeError}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <PrimaryButton
              accessibilityHint="Closes the word editor without making changes"
              accessibilityLabel="Cancel word editing"
              disabled={isSaving}
              label="Cancel"
              onPress={navigation.goBack}
              style={styles.action}
              variant="secondary"
            />
            <PrimaryButton
              accessibilityHint={editingId
                ? `Saves changes to ${committedJapanese || 'this word'}`
                : `Adds this word to Lesson ${lesson.number}`}
              accessibilityLabel={editingId ? 'Save word changes' : 'Save new word'}
              disabled={isSaving || !validation.canSave}
              label={isSaving ? 'Saving…' : 'Save'}
              onPress={save}
              style={styles.action}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  keyboardView: { flex: 1 },
  content: {
    flexGrow: 1,
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  heading: { gap: spacing.xs, marginBottom: spacing.sm },
  eyebrow: { color: colors.coral, fontSize: typography.micro, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: typography.display, fontWeight: '900', letterSpacing: -1 },
  subtitle: { color: colors.forest, fontSize: typography.body, fontWeight: '700' },
  field: { gap: spacing.sm },
  label: { color: colors.ink, fontSize: typography.small, fontWeight: '800' },
  input: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    color: colors.ink,
    fontSize: typography.body,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  errorText: { color: colors.error, fontSize: typography.small, fontWeight: '700', lineHeight: 20 },
  errorBox: {
    padding: spacing.md,
    color: colors.error,
    fontSize: typography.small,
    fontWeight: '700',
    lineHeight: 20,
    backgroundColor: colors.coralSoft,
    borderRadius: radii.sm,
  },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  action: { flex: 1, minWidth: 120 },
  unavailable: { flex: 1, justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
});
