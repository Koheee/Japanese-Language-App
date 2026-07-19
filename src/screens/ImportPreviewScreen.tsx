import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '../components/PrimaryButton';
import { RootStackParamList } from '../navigation/types';
import { useStudy } from '../state/StudyContext';
import { colors, radii, spacing, typography } from '../theme/tokens';
import {
  buildImportSuccessNavigationAction,
  createImportConfirmationController,
  handleImportPreviewBeforeRemove,
} from './importLifecycle';

type Props = NativeStackScreenProps<RootStackParamList, 'ImportPreview'>;

export function ImportPreviewScreen({ navigation }: Props) {
  const {
    clearVocabularyImportPreview,
    confirmVocabularyImport,
    vocabularyImportPreview,
  } = useStudy();
  const [isConfirming, setIsConfirming] = useState(false);
  const mountedRef = useRef(true);
  const confirmationControllerRef = useRef<ReturnType<
    typeof createImportConfirmationController
  > | null>(null);
  const confirmationController = confirmationControllerRef.current ??=
    createImportConfirmationController();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => navigation.addListener('beforeRemove', (event) => {
    handleImportPreviewBeforeRemove(
      confirmationController,
      event,
      clearVocabularyImportPreview,
    );
  }), [clearVocabularyImportPreview, confirmationController, navigation]);

  const cancel = () => {
    if (confirmationController.isConfirming()) return;
    clearVocabularyImportPreview();
    navigation.goBack();
  };

  const replaceVocabulary = async () => {
    if (!confirmationController.begin()) return;
    setIsConfirming(true);
    let committed = false;
    try {
      const result = await confirmVocabularyImport();
      if (result.ok && confirmationController.allowRemovalAfterCommit()) {
        committed = true;
        if (mountedRef.current && navigation.isFocused()) {
          navigation.dispatch(buildImportSuccessNavigationAction());
        }
      }
    } finally {
      if (!committed) confirmationController.finishFailure();
      if (mountedRef.current) setIsConfirming(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>VOCABULARY BACKUP</Text>
        <Text accessibilityRole="header" style={styles.title}>Import preview</Text>
        {!vocabularyImportPreview ? (
          <View style={styles.missingCard}>
            <Text style={styles.missingText}>No import is ready to preview.</Text>
            <PrimaryButton
              accessibilityHint="Closes the import preview without importing"
              accessibilityLabel="Cancel vocabulary import"
              label="Cancel"
              onPress={cancel}
              variant="secondary"
            />
          </View>
        ) : (
          <>
            <View style={styles.stats}>
              <Stat label="incoming records" value={vocabularyImportPreview.incomingRecordCount} />
              <Stat label="hidden choices" value={vocabularyImportPreview.incomingHiddenCount} />
              <Stat label="review cards" value={vocabularyImportPreview.incomingReviewCount} />
              <Stat label="affected IDs" value={vocabularyImportPreview.affectedVocabularyIds.length} />
            </View>

            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>Complete replacement</Text>
              <Text style={styles.warningBody}>
                This replaces all device vocabulary and hidden-word choices; it does not merge them.
              </Text>
            </View>

            {vocabularyImportPreview.baselineWarning ? (
              <Text accessibilityRole="alert" style={styles.baselineWarning}>
                {vocabularyImportPreview.baselineWarning}
              </Text>
            ) : null}

            <Text style={styles.recoveryCopy}>
              Undo last import remains available after reload until the next successful vocabulary mutation or affected-card review.
            </Text>

            <View style={styles.actions}>
              <PrimaryButton
                accessibilityHint="Closes this preview without replacing device vocabulary"
                accessibilityLabel="Cancel vocabulary import"
                disabled={isConfirming}
                label="Cancel"
                onPress={cancel}
                style={styles.action}
                variant="secondary"
              />
              <PrimaryButton
                accessibilityHint="Replaces all device vocabulary with this validated backup"
                accessibilityLabel="Replace device vocabulary"
                disabled={isConfirming}
                label={isConfirming ? 'Replacing...' : 'Replace device vocabulary'}
                onPress={replaceVocabulary}
                style={styles.action}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { flexGrow: 1, gap: spacing.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  eyebrow: { color: colors.coral, fontSize: typography.micro, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: typography.display, fontWeight: '900', letterSpacing: -1 },
  missingCard: { marginTop: spacing.xl, padding: spacing.xl, gap: spacing.lg, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line },
  missingText: { color: colors.inkMuted, fontSize: typography.body, lineHeight: 24 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { minWidth: 132, flexGrow: 1, alignItems: 'center', padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.line },
  statValue: { color: colors.forest, fontSize: typography.title, fontWeight: '900' },
  statLabel: { marginTop: spacing.xs, color: colors.inkMuted, fontSize: typography.micro, fontWeight: '700', textAlign: 'center' },
  warningCard: { padding: spacing.xl, gap: spacing.sm, backgroundColor: colors.coralSoft, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.coral },
  warningTitle: { color: colors.error, fontSize: typography.heading, fontWeight: '900' },
  warningBody: { color: colors.ink, fontSize: typography.body, lineHeight: 24, fontWeight: '700' },
  baselineWarning: { padding: spacing.lg, color: colors.error, fontSize: typography.small, lineHeight: 20, fontWeight: '700', backgroundColor: colors.goldSoft, borderRadius: radii.md },
  recoveryCopy: { color: colors.inkMuted, fontSize: typography.small, lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  action: { minWidth: 180, flexGrow: 1, minHeight: 44 },
});
