import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { createLatestReferenceAttemptCoordinator } from '../content/referenceInfluences';
import { colors, radii, spacing, typography } from '../theme/tokens';
import {
  projectReferenceActionStyle,
  referenceActionTextStyle,
  referenceInfluencesCardPresentation,
} from './referenceInfluencesPresentation';

type Props = {
  openUrl?: (url: string) => Promise<unknown>;
};

const openWithLinking = (url: string) => Linking.openURL(url);

export function ReferenceInfluencesCard({ openUrl = openWithLinking }: Props) {
  const referenceAttemptCoordinatorRef = useRef<ReturnType<
    typeof createLatestReferenceAttemptCoordinator
  > | null>(null);
  const referenceAttemptCoordinator = referenceAttemptCoordinatorRef.current ??=
    createLatestReferenceAttemptCoordinator();
  const [focusedReferenceUrl, setFocusedReferenceUrl] = useState<string | null>(null);
  const [referenceError, setReferenceError] = useState<string | null>(null);

  useEffect(() => {
    return () => referenceAttemptCoordinator.deactivate();
  }, [referenceAttemptCoordinator]);

  const openReference = (url: string) => {
    setReferenceError(null);
    void referenceAttemptCoordinator.open(url, openUrl, setReferenceError);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{referenceInfluencesCardPresentation.heading}</Text>
      {referenceInfluencesCardPresentation.paragraphs.map((paragraph) => (
        <Text key={paragraph} style={styles.body}>{paragraph}</Text>
      ))}
      {referenceInfluencesCardPresentation.links.map((link) => (
        <Pressable
          key={link.url}
          accessibilityRole={link.accessibilityRole}
          accessibilityLabel={link.accessibilityLabel}
          onPress={() => openReference(link.url)}
          onFocus={() => setFocusedReferenceUrl(link.url)}
          onBlur={() => setFocusedReferenceUrl((current) => (
            current === link.url ? null : current
          ))}
          style={({ pressed }) => projectReferenceActionStyle({
            focused: focusedReferenceUrl === link.url,
            pressed,
          })}
        >
          <Text style={referenceActionTextStyle}>{link.title}</Text>
        </Pressable>
      ))}
      {referenceError ? (
        <Text
          accessibilityRole={referenceInfluencesCardPresentation.errorAccessibility.accessibilityRole}
          accessibilityLiveRegion={referenceInfluencesCardPresentation.errorAccessibility.accessibilityLiveRegion}
          style={styles.error}
        >
          {referenceError}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.xxl, padding: spacing.xl, gap: spacing.md, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line },
  title: { color: colors.ink, fontSize: typography.heading, fontWeight: '900' },
  body: { color: colors.inkMuted, fontSize: typography.small, lineHeight: 20 },
  error: { color: colors.error, fontSize: typography.small, fontWeight: '700', lineHeight: 20 },
});
