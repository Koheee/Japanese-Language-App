import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, useIsFocused } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { ProgressBar } from '../components/ProgressBar';
import { Screen } from '../components/Screen';
import { VocabularyFilePicker } from '../components/VocabularyFilePicker';
import {
  openReferenceInfluence,
  referenceInfluences,
} from '../content/referenceInfluences';
import { curriculum } from '../data/curriculum';
import { getLesson, lessons } from '../data/lessons';
import { RootStackParamList, RootTabParamList } from '../navigation/types';
import { getReviewStats } from '../services/srs';
import { buildVocabularyBackup } from '../services/vocabularyBackup';
import { exportVocabularyBackupFile } from '../services/webFileTransfer';
import { isUserCancellation } from '../services/webFileTransferCore';
import { useStudy } from '../state/StudyContext';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { createExclusiveActionCoordinator } from './importLifecycle';

type Props = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, 'Progress'>,
  NativeStackScreenProps<RootStackParamList, 'MainTabs'>
>;

type BusyAction = 'export' | 'import' | 'undo';

export function ProgressScreen({ navigation }: Props) {
  const {
    clearVocabularyImportPreview,
    prepareVocabularyImport,
    state,
    undoLastVocabularyImport,
  } = useStudy();
  const isFocused = useIsFocused();
  const focusedRef = useRef(isFocused);
  const mountedRef = useRef(true);
  const actionCoordinatorRef = useRef<ReturnType<
    typeof createExclusiveActionCoordinator<BusyAction>
  > | null>(null);
  const actionCoordinator = actionCoordinatorRef.current ??=
    createExclusiveActionCoordinator<BusyAction>();
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null);
  const [transferMessage, setTransferMessage] = useState<string | null>(null);
  const [transferIsError, setTransferIsError] = useState(false);
  const [importIssues, setImportIssues] = useState<string[]>([]);
  const [focusedReferenceUrl, setFocusedReferenceUrl] = useState<string | null>(null);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  focusedRef.current = isFocused;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const progressItems = Object.values(state.progress);
  const attempts = progressItems.reduce((sum, item) => sum + item.attempts, 0);
  const correct = progressItems.reduce((sum, item) => sum + item.correctAnswers, 0);
  const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0;
  const { reviewedActive } = getReviewStats(state.reviewCards);

  const runAction = async (action: BusyAction, operation: () => Promise<void>) => {
    if (!actionCoordinator.claim(action)) return;
    setBusyAction(action);
    try {
      await operation();
    } finally {
      actionCoordinator.release(action);
      if (mountedRef.current) setBusyAction(null);
    }
  };

  const exportBackup = async () => runAction('export', async () => {
    try {
      const backup = buildVocabularyBackup(state, lessons, new Date().toISOString());
      const result = await exportVocabularyBackupFile(backup);
      if (!mountedRef.current) return;
      if (result === 'shared') {
        setTransferIsError(false);
        setTransferMessage('Vocabulary backup shared.');
      }
      if (result === 'downloaded') {
        setTransferIsError(false);
        setTransferMessage('Vocabulary backup downloaded.');
      }
      if (result === 'unavailable') {
        setTransferIsError(true);
        setTransferMessage('Vocabulary backup export is unavailable on this device.');
      }
    } catch (cause) {
      if (isUserCancellation(cause) || !mountedRef.current) return;
      setTransferIsError(true);
      setTransferMessage(cause instanceof Error ? cause.message : String(cause));
    }
  });

  const handlePickedFile = (bytes: Uint8Array, _fileName: string) => {
    if (
      !actionCoordinator.owns('import')
      || !mountedRef.current
      || !focusedRef.current
    ) return;
    const result = prepareVocabularyImport(bytes);
    if (result.ok) {
      setImportIssues([]);
      navigation.navigate('ImportPreview');
    } else {
      clearVocabularyImportPreview();
      setImportIssues(result.issues);
    }
  };

  const handlePickerError = (message: string) => {
    if (
      !actionCoordinator.owns('import')
      || !mountedRef.current
      || !focusedRef.current
    ) return;
    clearVocabularyImportPreview();
    setImportIssues([message]);
  };

  const handlePickerReadStart = () => {
    if (!mountedRef.current || !focusedRef.current) return false;
    if (!actionCoordinator.claim('import')) return false;
    setBusyAction('import');
    return true;
  };

  const handlePickerReadFinish = () => {
    if (!actionCoordinator.release('import')) return;
    if (mountedRef.current) setBusyAction(null);
  };

  const undoImport = async () => runAction('undo', async () => {
    const result = await undoLastVocabularyImport();
    if (result.ok && mountedRef.current) {
      setTransferIsError(false);
      setTransferMessage('Last vocabulary import undone.');
    }
  });

  const openReference = (url: string) => {
    setReferenceError(null);
    void openReferenceInfluence(url, (targetUrl) => Linking.openURL(targetUrl)).then((message) => {
      if (mountedRef.current) setReferenceError(message);
    });
  };

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
        <Metric value={String(reviewedActive)} label="cards reviewed" />
        <Metric value={String(attempts)} label="answers checked" />
      </View>

      <View style={styles.backupCard}>
        <Text style={styles.backupEyebrow}>DEVICE-LOCAL BACKUP</Text>
        <Text style={styles.backupTitle}>Protect your vocabulary changes</Text>
        <Text style={styles.backupBody}>
          Vocabulary changes are stored only on this device. Clearing site data or removing the PWA can remove them. Export a backup to transfer them manually.
        </Text>
        <View style={styles.backupActions}>
          <PrimaryButton
            accessibilityHint="Shares or downloads the current vocabulary backup"
            accessibilityLabel="Export vocabulary backup"
            disabled={busyAction !== null}
            label={busyAction === 'export' ? 'Exporting...' : 'Export'}
            onPress={exportBackup}
            style={styles.backupAction}
            variant="secondary"
          />
          <View style={styles.pickerAction}>
            <VocabularyFilePicker
              disabled={busyAction !== null}
              onError={handlePickerError}
              onPick={handlePickedFile}
              onReadFinish={handlePickerReadFinish}
              onReadStart={handlePickerReadStart}
            />
          </View>
          <PrimaryButton
            accessibilityHint="Restores the vocabulary state from before the most recent import"
            accessibilityLabel="Undo last vocabulary import"
            disabled={busyAction !== null || !state.lastImportRecovery}
            label={busyAction === 'undo' ? 'Undoing...' : 'Undo last import'}
            onPress={undoImport}
            style={styles.backupAction}
            variant="secondary"
          />
        </View>
        {transferMessage ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.transferMessage, transferIsError && styles.transferError]}
          >
            {transferMessage}
          </Text>
        ) : null}
        {importIssues.length ? (
          <View accessibilityLiveRegion="assertive" style={styles.importIssues}>
            {importIssues.map((issue, index) => (
              <Text accessibilityRole="alert" key={`${index}-${issue}`} style={styles.importIssue}>
                {issue}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.referenceCard}>
        <Text style={styles.referenceTitle}>{referenceInfluences.heading}</Text>
        <Text style={styles.referenceBody}>{referenceInfluences.body}</Text>
        <Text style={styles.referenceBody}>{referenceInfluences.license}</Text>
        <Text style={styles.referenceBody}>{referenceInfluences.originality}</Text>
        <Text style={styles.referenceBody}>{referenceInfluences.nonEndorsement}</Text>
        {referenceInfluences.links.map((link) => (
          <Pressable
            key={link.url}
            accessibilityRole="link"
            accessibilityLabel={`${link.title}; opens an external site`}
            onPress={() => openReference(link.url)}
            onFocus={() => setFocusedReferenceUrl(link.url)}
            onBlur={() => setFocusedReferenceUrl((current) => (
              current === link.url ? null : current
            ))}
            style={({ pressed }) => [
              styles.referenceAction,
              focusedReferenceUrl === link.url && styles.referenceActionFocused,
              pressed && styles.referenceActionPressed,
            ]}
          >
            <Text style={styles.referenceActionText}>{link.title}</Text>
          </Pressable>
        ))}
        {referenceError ? (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={styles.referenceError}
          >
            {referenceError}
          </Text>
        ) : null}
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
              <PrimaryButton
                accessibilityHint={`Opens the vocabulary manager for Lesson ${lesson.number}`}
                accessibilityLabel={`Manage Lesson ${lesson.number} words`}
                label="Manage words"
                onPress={() => navigation.navigate('VocabularyManager', { lessonId: lesson.id })}
                style={styles.manageButton}
                variant="secondary"
              />
            </View>
          </View>
        );
      }) : (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No marks on the page yet</Text>
          <Text style={styles.emptyBody}>Open Lesson 1 and begin its exercises. Your activity will collect here automatically.</Text>
          <PrimaryButton
            accessibilityHint="Opens the vocabulary manager for Lesson 1"
            accessibilityLabel="Manage Lesson 1 words"
            label="Manage Lesson 1 words"
            onPress={() => navigation.navigate('VocabularyManager', { lessonId: lessons[0]!.id })}
            style={styles.emptyManageButton}
            variant="secondary"
          />
        </View>
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
  backupCard: { marginTop: spacing.xxl, padding: spacing.xl, gap: spacing.md, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line },
  backupEyebrow: { color: colors.coral, fontSize: typography.micro, fontWeight: '900', letterSpacing: 1.2 },
  backupTitle: { color: colors.ink, fontSize: typography.heading, fontWeight: '900' },
  backupBody: { color: colors.inkMuted, fontSize: typography.small, lineHeight: 20 },
  backupActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  backupAction: { minHeight: 44, flexGrow: 1, paddingHorizontal: spacing.lg },
  pickerAction: { minWidth: 88, flexGrow: 1 },
  transferMessage: { color: colors.success, fontSize: typography.small, fontWeight: '700', lineHeight: 20 },
  transferError: { color: colors.error },
  importIssues: { gap: spacing.xs, padding: spacing.md, backgroundColor: colors.coralSoft, borderRadius: radii.sm },
  importIssue: { color: colors.error, fontSize: typography.small, fontWeight: '700', lineHeight: 20 },
  referenceCard: { marginTop: spacing.xxl, padding: spacing.xl, gap: spacing.md, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line },
  referenceTitle: { color: colors.ink, fontSize: typography.heading, fontWeight: '900' },
  referenceBody: { color: colors.inkMuted, fontSize: typography.small, lineHeight: 20 },
  referenceAction: {
    minHeight: 44,
    width: '100%',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceStrong,
  },
  referenceActionFocused: { borderColor: colors.forest },
  referenceActionPressed: { backgroundColor: colors.forestSoft },
  referenceActionText: {
    width: '100%',
    flexShrink: 1,
    color: colors.forest,
    fontSize: typography.small,
    fontWeight: '800',
    lineHeight: 20,
    textDecorationLine: 'underline',
  },
  referenceError: { color: colors.error, fontSize: typography.small, fontWeight: '700', lineHeight: 20 },
  sectionTitle: { marginTop: spacing.xxl, marginBottom: spacing.lg, color: colors.ink, fontSize: typography.title, fontWeight: '900' },
  lessonCard: { flexDirection: 'row', gap: spacing.lg, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line },
  lessonNumber: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.coral, borderRadius: 15 },
  lessonNumberText: { color: colors.white, fontSize: typography.small, fontWeight: '900' },
  lessonCopy: { flex: 1, gap: spacing.xs },
  lessonJapanese: { color: colors.forest, fontSize: typography.micro, fontWeight: '800' },
  lessonTitle: { marginBottom: spacing.sm, color: colors.ink, fontSize: typography.heading, fontWeight: '800' },
  lessonMeta: { marginTop: spacing.xs, color: colors.inkMuted, fontSize: typography.micro },
  manageButton: { minHeight: 44, alignSelf: 'flex-start', marginTop: spacing.sm, paddingHorizontal: spacing.lg },
  empty: { padding: spacing.xl, gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line },
  emptyTitle: { color: colors.ink, fontSize: typography.heading, fontWeight: '800' },
  emptyBody: { color: colors.inkMuted, fontSize: typography.small, lineHeight: 20 },
  emptyManageButton: { minHeight: 44, alignSelf: 'flex-start', marginTop: spacing.sm, paddingHorizontal: spacing.lg },
  principle: { marginTop: spacing.xxl, flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.xl, backgroundColor: colors.goldSoft, borderRadius: radii.lg },
  principleKanji: { color: colors.coral, fontSize: 40, fontWeight: '800' },
  principleCopy: { flex: 1, gap: spacing.xs },
  principleTitle: { color: colors.ink, fontSize: typography.heading, fontWeight: '800' },
  principleBody: { color: colors.inkMuted, fontSize: typography.small, lineHeight: 20 },
});
