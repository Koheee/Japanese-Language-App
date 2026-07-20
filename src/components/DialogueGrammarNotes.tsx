import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DialogueTurn, GrammarPoint } from '../models/content';
import { colors, radii, spacing, typography } from '../theme/tokens';
import {
  createDialogueGrammarNoteItems,
  toggleDialogueGrammarNote,
} from './dialogueGrammarNotesModel';

interface Props {
  turn: DialogueTurn;
  grammar: readonly GrammarPoint[];
}

export function DialogueGrammarNotes({ turn, grammar }: Props) {
  const [activeGrammarId, setActiveGrammarId] = useState<string | null>(null);
  const [focusedGrammarId, setFocusedGrammarId] = useState<string | null>(null);
  const items = createDialogueGrammarNoteItems(turn, grammar);

  if (items.length === 0) return null;

  return (
    <View style={styles.notes}>
      <Text style={styles.eyebrow}>GRAMMAR IN THIS LINE</Text>
      <View style={styles.noteList}>
        {items.map((item) => (
          <View key={item.grammarId} style={styles.noteItem}>
            <Pressable
              accessibilityHint={activeGrammarId === item.grammarId
                ? 'Collapses this grammar explanation.'
                : 'Shows why this grammar fits the dialogue line.'}
              accessibilityLabel={item.accessibilityLabel}
              accessibilityRole="button"
              accessibilityState={{ selected: activeGrammarId === item.grammarId, expanded: activeGrammarId === item.grammarId }}
              aria-expanded={activeGrammarId === item.grammarId}
              aria-selected={activeGrammarId === item.grammarId}
              onBlur={() => setFocusedGrammarId((current) => (
                current === item.grammarId ? null : current
              ))}
              onFocus={() => setFocusedGrammarId(item.grammarId)}
              onPress={() => setActiveGrammarId((current) => toggleDialogueGrammarNote(current, item.grammarId))}
              style={({ pressed }) => [
                styles.noteButton,
                activeGrammarId === item.grammarId && styles.noteButtonActive,
                focusedGrammarId === item.grammarId && styles.noteButtonFocused,
                pressed && styles.noteButtonPressed,
              ]}
            >
              <Text style={styles.notePattern}>{item.pattern}</Text>
            </Pressable>

            {activeGrammarId === item.grammarId ? (
              <View style={styles.explanation}>
                <Text style={styles.explanationTitle}>{item.title}</Text>
                <Text style={styles.explanationBody}>{item.explanation}</Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notes: {
    width: '100%',
    marginTop: spacing.sm,
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  eyebrow: {
    color: colors.inkMuted,
    fontSize: typography.micro,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  noteList: { width: '100%', gap: spacing.sm },
  noteItem: { width: '100%', gap: spacing.sm },
  noteButton: {
    minHeight: 44,
    maxWidth: '100%',
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceStrong,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  noteButtonActive: { backgroundColor: colors.goldSoft },
  noteButtonFocused: { borderColor: colors.forest },
  noteButtonPressed: { opacity: 0.78 },
  notePattern: {
    flexShrink: 1,
    color: colors.forest,
    fontSize: typography.small,
    fontWeight: '900',
    lineHeight: 20,
  },
  explanation: {
    width: '100%',
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.coral,
  },
  explanationTitle: {
    color: colors.ink,
    fontSize: typography.small,
    fontWeight: '900',
    lineHeight: 20,
  },
  explanationBody: { color: colors.ink, fontSize: typography.small, lineHeight: 20 },
});
