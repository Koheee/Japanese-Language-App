import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { GrammarPoint } from '../models/content';
import { colors, radii, spacing, typography } from '../theme/tokens';
import {
  createLatestLessonReferenceAttemptCoordinator,
  createLessonReferenceItems,
} from './lessonReferencePresentation';

interface Props {
  points: readonly GrammarPoint[];
  openUrl?: (url: string) => Promise<unknown>;
}

const openWithLinking = (url: string) => Linking.openURL(url);

export function LessonReferenceSection({ points, openUrl = openWithLinking }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [focusedReferenceUrl, setFocusedReferenceUrl] = useState<string | null>(null);
  const [toggleFocused, setToggleFocused] = useState(false);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const referenceAttemptCoordinatorRef = useRef<ReturnType<
    typeof createLatestLessonReferenceAttemptCoordinator
  > | null>(null);
  const referenceAttemptCoordinator = referenceAttemptCoordinatorRef.current ??=
    createLatestLessonReferenceAttemptCoordinator();
  const items = createLessonReferenceItems(points);

  useEffect(() => {
    return () => referenceAttemptCoordinator.deactivate();
  }, [referenceAttemptCoordinator]);

  if (items.length === 0) return null;

  const openReference = (url: string) => {
    setReferenceError(null);
    void referenceAttemptCoordinator.open(url, openUrl, setReferenceError);
  };

  return (
    <View style={styles.section}>
      <Pressable
        accessibilityHint={expanded ? 'Collapses the optional links.' : 'Expands the optional links.'}
        accessibilityLabel="Optional references for this lesson"
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        aria-expanded={expanded}
        onBlur={() => setToggleFocused(false)}
        onFocus={() => setToggleFocused(true)}
        onPress={() => setExpanded((current) => !current)}
        style={({ pressed }) => [
          styles.toggle,
          toggleFocused && styles.toggleFocused,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.toggleLabel}>Optional references for this lesson</Text>
        <Text
          accessibilityElementsHidden
          aria-hidden={true}
          importantForAccessibility="no"
          style={styles.toggleGlyph}
        >
          {expanded ? '−' : '+'}
        </Text>
      </Pressable>

      {expanded ? (
        <View style={styles.expandedContent}>
          <Text style={styles.context}>
            This lesson is complete without opening these links. These references were used only for editorial cross-checking.
          </Text>
          <View style={styles.linkList}>
            {items.map((item) => (
              <Pressable
                accessibilityLabel={item.accessibilityLabel}
                accessibilityRole="link"
                key={item.url}
                onBlur={() => setFocusedReferenceUrl((current) => (
                  current === item.url ? null : current
                ))}
                onFocus={() => setFocusedReferenceUrl(item.url)}
                onPress={() => openReference(item.url)}
                style={({ pressed }) => [
                  styles.link,
                  focusedReferenceUrl === item.url && styles.linkFocused,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.linkText}>{item.title}</Text>
              </Pressable>
            ))}
          </View>
          {referenceError ? (
            <Text
              accessibilityLiveRegion="assertive"
              accessibilityRole="alert"
              aria-live="assertive"
              style={styles.error}
            >
              {referenceError}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: '100%',
    marginTop: spacing.sm,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  toggle: {
    minHeight: 44,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceStrong,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  toggleFocused: { borderColor: colors.forest },
  toggleLabel: {
    flex: 1,
    flexShrink: 1,
    color: colors.inkMuted,
    fontSize: typography.small,
    fontWeight: '800',
  },
  toggleGlyph: { color: colors.forest, fontSize: typography.heading, fontWeight: '800' },
  expandedContent: { width: '100%', gap: spacing.md, paddingTop: spacing.md },
  context: { color: colors.inkMuted, fontSize: typography.small, lineHeight: 20 },
  linkList: { width: '100%', gap: spacing.sm },
  link: {
    minHeight: 44,
    width: '100%',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  linkFocused: { borderColor: colors.forest },
  linkText: {
    width: '100%',
    flexShrink: 1,
    color: colors.forest,
    fontSize: typography.small,
    fontWeight: '800',
    lineHeight: 20,
    textDecorationLine: 'underline',
  },
  pressed: { opacity: 0.78 },
  error: { color: colors.error, fontSize: typography.small, fontWeight: '700', lineHeight: 20 },
});
