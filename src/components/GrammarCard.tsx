import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { GrammarPoint } from '../models/content';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { GrammarFormationList } from './GrammarFormationList';
import {
  createGrammarCardState,
  projectGrammarCard,
  setGrammarCardToggleFocused,
  toggleGrammarCardSection,
  type GrammarCardTogglePresentation,
} from './grammarCardPresentation';

interface GrammarSectionToggleProps {
  expanded: boolean;
  focused: boolean;
  label: string;
  onBlur: () => void;
  onFocus: () => void;
  onPress: () => void;
  presentation: GrammarCardTogglePresentation;
}

function GrammarSectionToggle({
  expanded,
  focused,
  label,
  onBlur,
  onFocus,
  onPress,
  presentation,
}: GrammarSectionToggleProps) {
  return (
    <Pressable
      accessibilityHint={presentation.accessibilityHint}
      accessibilityLabel={presentation.accessibilityLabel}
      accessibilityRole={presentation.accessibilityRole}
      accessibilityState={presentation.accessibilityState}
      aria-expanded={presentation.accessibilityState.expanded}
      onBlur={onBlur}
      onFocus={onFocus}
      onPress={onPress}
      style={({ pressed }) => [
        styles.toggle,
        { minHeight: presentation.minimumTouchTarget },
        focused && styles.toggleFocused,
        pressed && styles.togglePressed,
      ]}
    >
      <Text style={styles.toggleLabel}>{label}</Text>
      <Text
        accessibilityElementsHidden
        aria-hidden={true}
        importantForAccessibility="no"
        style={styles.toggleGlyph}
      >
        {expanded ? '−' : '+'}
      </Text>
    </Pressable>
  );
}

export function GrammarCard({ point, index }: { point: GrammarPoint; index: number }) {
  const [cardState, setCardState] = useState(createGrammarCardState);
  const presentation = projectGrammarCard(point, cardState);

  const toggle = (section: 'insight' | 'deeper') => {
    setCardState((current) => toggleGrammarCardSection(current, section));
  };
  const setFocused = (section: 'insight' | 'deeper', focused: boolean) => {
    setCardState((current) => setGrammarCardToggleFocused(current, section, focused));
  };

  return (
    <View style={styles.card}>
      <View style={styles.headingRow}>
        <View style={styles.index}><Text style={styles.indexText}>{index + 1}</Text></View>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>{point.title}</Text>
          <Text style={styles.pattern}>{point.pattern}</Text>
        </View>
      </View>

      <View style={styles.translation}>
        <Text style={styles.translationText}>{point.plainEnglish}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>THE BASICS</Text>
        <Text style={styles.body}>{point.explanation}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>BUILD THE FORM</Text>
        <GrammarFormationList formation={point.formation} />
      </View>

      <View style={styles.section}>
        <GrammarSectionToggle
          expanded={cardState.insightExpanded}
          focused={cardState.focusedToggle === 'insight'}
          label="A JAPANESE-FIRST PICTURE"
          onBlur={() => setFocused('insight', false)}
          onFocus={() => setFocused('insight', true)}
          onPress={() => toggle('insight')}
          presentation={presentation.insightToggle}
        />
        {presentation.insight ? (
          <View style={styles.insightBox}>
            <Text style={styles.insightText}>{presentation.insight.whyItWorks}</Text>
          </View>
        ) : null}
        <View style={styles.boundarySection}>
          <Text style={styles.sectionLabel}>WHEN IT FITS</Text>
          <Text style={styles.body}>
            {presentation.insight
              ? presentation.insight.usageBoundary
              : point.usageBoundary}
          </Text>
        </View>
      </View>

      <View style={styles.compareBox}>
        <Text style={styles.sectionLabel}>COMPARE IT</Text>
        <Text style={styles.compareWith}>{point.contrast.with}</Text>
        <Text style={styles.body}>{point.contrast.explanation}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>EXAMPLES</Text>
        <View style={styles.examples}>
          {point.examples.map((example, exampleIndex) => (
            <View key={`${example.japanese}-${exampleIndex}`} style={styles.example}>
              <Text style={styles.japanese}>{example.japanese}</Text>
              {example.reading ? <Text style={styles.reading}>{example.reading}</Text> : null}
              <Text style={styles.english}>{example.english}</Text>
            </View>
          ))}
        </View>
      </View>

      {point.commonMistake ? (
        <View style={styles.mistake}>
          <Text style={styles.sectionLabel}>COMMON TURN</Text>
          <Text style={styles.avoid}>×  {point.commonMistake.avoid}</Text>
          <Text style={styles.prefer}>○  {point.commonMistake.prefer}</Text>
          <Text style={styles.mistakeReason}>{point.commonMistake.reason}</Text>
        </View>
      ) : null}

      {presentation.deeperToggle ? (
        <View style={styles.section}>
          <GrammarSectionToggle
            expanded={cardState.deeperExpanded}
            focused={cardState.focusedToggle === 'deeper'}
            label="GO DEEPER"
            onBlur={() => setFocused('deeper', false)}
            onFocus={() => setFocused('deeper', true)}
            onPress={() => toggle('deeper')}
            presentation={presentation.deeperToggle}
          />
          {presentation.deeper ? (
            <View style={styles.deeperBox}>
              {presentation.deeper.notes?.map((note, noteIndex) => (
                <Text key={`note-${noteIndex}`} style={styles.note}>•  {note}</Text>
              ))}
              {presentation.deeper.beyondBasics?.map((note, noteIndex) => (
                <Text key={`beyond-${noteIndex}`} style={styles.note}>•  {note}</Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    padding: spacing.xl,
    gap: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  index: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.forest },
  indexText: { color: colors.white, fontWeight: '800' },
  headingCopy: { flex: 1, flexShrink: 1, gap: spacing.xs },
  title: { color: colors.ink, fontSize: typography.heading, fontWeight: '800' },
  pattern: { flexShrink: 1, color: colors.coral, fontSize: typography.body, fontWeight: '800' },
  translation: { alignSelf: 'flex-start', maxWidth: '100%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.coralSoft, borderRadius: radii.sm },
  translationText: { flexShrink: 1, color: colors.ink, fontSize: typography.small, fontWeight: '700' },
  section: { width: '100%', gap: spacing.md },
  boundarySection: { width: '100%', gap: spacing.md },
  sectionLabel: { color: colors.inkMuted, fontSize: typography.micro, fontWeight: '900', letterSpacing: 1 },
  body: { color: colors.ink, fontSize: typography.body, lineHeight: 25 },
  toggle: {
    minHeight: 44,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surfaceStrong,
  },
  toggleFocused: { borderColor: colors.forest },
  togglePressed: { opacity: 0.78 },
  toggleLabel: { flex: 1, color: colors.ink, fontSize: typography.small, fontWeight: '900', letterSpacing: 0.5 },
  toggleGlyph: { color: colors.coral, fontSize: typography.heading, fontWeight: '800' },
  insightBox: { padding: spacing.lg, backgroundColor: colors.goldSoft, borderRadius: radii.md },
  insightText: { color: colors.ink, fontSize: typography.small, lineHeight: 21 },
  compareBox: { width: '100%', gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.coralSoft, borderRadius: radii.md },
  compareWith: { color: colors.coral, fontSize: typography.body, fontWeight: '800', lineHeight: 24 },
  examples: { width: '100%', gap: spacing.md },
  example: { width: '100%', paddingLeft: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.forestSoft },
  japanese: { color: colors.ink, fontSize: typography.body, fontWeight: '700', lineHeight: 24 },
  reading: { color: colors.forest, fontSize: typography.small, lineHeight: 19 },
  english: { color: colors.inkMuted, fontSize: typography.small, lineHeight: 19 },
  mistake: { width: '100%', gap: spacing.xs, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.line },
  avoid: { color: colors.error, fontSize: typography.small },
  prefer: { color: colors.success, fontSize: typography.small, fontWeight: '700' },
  mistakeReason: { marginTop: spacing.xs, color: colors.inkMuted, fontSize: typography.small, lineHeight: 20 },
  deeperBox: { gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.forestSoft, borderRadius: radii.md },
  note: { color: colors.ink, fontSize: typography.small, lineHeight: 20 },
});
