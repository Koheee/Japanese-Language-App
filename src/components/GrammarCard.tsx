import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { GrammarPoint } from '../models/content';
import { colors, radii, spacing, typography } from '../theme/tokens';
import {
  createGrammarInsightState,
  projectGrammarInsight,
  setGrammarInsightFocused,
  toggleGrammarInsight,
} from './grammarCardPresentation';

export function GrammarCard({ point, index }: { point: GrammarPoint; index: number }) {
  const [insightState, setInsightState] = useState(createGrammarInsightState);
  const insight = projectGrammarInsight(point, insightState);

  return (
    <View style={styles.card}>
      <View style={styles.headingRow}>
        <View style={styles.index}><Text style={styles.indexText}>{index + 1}</Text></View>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>{point.title}</Text>
          <Text style={styles.pattern}>{point.pattern}</Text>
        </View>
      </View>

      <View style={styles.translation}><Text style={styles.translationText}>{point.plainEnglish}</Text></View>
      <Text style={styles.body}>{point.explanation}</Text>

      <Pressable
        accessibilityRole={insight.toggle.accessibilityRole}
        accessibilityLabel={insight.toggle.accessibilityLabel}
        accessibilityHint={insight.toggle.accessibilityHint}
        accessibilityState={insight.toggle.accessibilityState}
        onPress={() => setInsightState((current) => toggleGrammarInsight(current))}
        onFocus={() => setInsightState((current) => setGrammarInsightFocused(current, true))}
        onBlur={() => setInsightState((current) => setGrammarInsightFocused(current, false))}
        style={[
          styles.insightToggle,
          { minHeight: insight.toggle.minimumTouchTarget },
          insightState.focused && styles.insightToggleFocused,
        ]}
      >
        <Text style={styles.insightToggleLabel}>Japanese-first insight</Text>
        <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.insightChevron}>
          {insightState.expanded ? '−' : '+'}
        </Text>
      </Pressable>

      {insight.content ? (
        <View style={styles.whyBox}>
          <Text style={styles.whyText}>{insight.content.whyItWorks}</Text>
          <Text style={styles.boundaryLabel}>USAGE BOUNDARY</Text>
          <Text style={styles.whyText}>{insight.content.usageBoundary}</Text>
          {insight.content.notes?.map((note) => (
            <Text key={note} style={styles.note}>•  {note}</Text>
          ))}
          {insight.content.furtherReading?.map((reference) => (
            <Pressable
              key={reference.url}
              accessibilityRole="link"
              accessibilityLabel={`Further reading: ${reference.title}; opens an external site`}
              onPress={() => { void Linking.openURL(reference.url); }}
              style={styles.referenceLink}
            >
              <Text style={styles.referenceLinkText}>Further reading: {reference.title}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.examples}>
        {point.examples.map((example) => (
          <View key={example.japanese} style={styles.example}>
            <Text style={styles.japanese}>{example.japanese}</Text>
            {example.reading ? <Text style={styles.reading}>{example.reading}</Text> : null}
            <Text style={styles.english}>{example.english}</Text>
          </View>
        ))}
      </View>

      {point.commonMistake ? (
        <View style={styles.mistake}>
          <Text style={styles.mistakeLabel}>COMMON TURN</Text>
          <Text style={styles.avoid}>×  {point.commonMistake.avoid}</Text>
          <Text style={styles.prefer}>○  {point.commonMistake.prefer}</Text>
          <Text style={styles.mistakeReason}>{point.commonMistake.reason}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.xl, gap: spacing.lg, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  index: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.forest },
  indexText: { color: colors.white, fontWeight: '800' },
  headingCopy: { flex: 1, gap: spacing.xs },
  title: { color: colors.ink, fontSize: typography.heading, fontWeight: '800' },
  pattern: { color: colors.coral, fontSize: typography.body, fontWeight: '800' },
  translation: { alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.coralSoft, borderRadius: radii.sm },
  translationText: { color: colors.ink, fontSize: typography.small, fontWeight: '700' },
  body: { color: colors.ink, fontSize: typography.body, lineHeight: 25 },
  insightToggle: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceStrong,
  },
  insightToggleFocused: { borderWidth: 2, borderColor: colors.coral },
  insightToggleLabel: { color: colors.ink, fontSize: typography.small, fontWeight: '800' },
  insightChevron: { color: colors.coral, fontSize: typography.heading, fontWeight: '800' },
  whyBox: { gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.goldSoft, borderRadius: radii.md },
  whyText: { color: colors.ink, fontSize: typography.small, lineHeight: 21 },
  boundaryLabel: { color: colors.inkMuted, fontSize: typography.micro, fontWeight: '900', letterSpacing: 1 },
  referenceLink: { minHeight: 44, justifyContent: 'center', paddingVertical: spacing.sm },
  referenceLinkText: {
    color: colors.forest,
    fontSize: typography.small,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  examples: { gap: spacing.sm },
  example: { paddingLeft: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.forestSoft },
  japanese: { color: colors.ink, fontSize: typography.body, fontWeight: '700', lineHeight: 24 },
  reading: { color: colors.forest, fontSize: typography.small, lineHeight: 19 },
  english: { color: colors.inkMuted, fontSize: typography.small, lineHeight: 19 },
  note: { color: colors.inkMuted, fontSize: typography.small, lineHeight: 20 },
  mistake: { gap: spacing.xs, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.line },
  mistakeLabel: { color: colors.inkMuted, fontSize: typography.micro, fontWeight: '900', letterSpacing: 1 },
  avoid: { color: colors.error, fontSize: typography.small },
  prefer: { color: colors.success, fontSize: typography.small, fontWeight: '700' },
  mistakeReason: { marginTop: spacing.xs, color: colors.inkMuted, fontSize: typography.small, lineHeight: 20 },
});
