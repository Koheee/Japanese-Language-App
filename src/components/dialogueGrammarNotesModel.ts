import type { DialogueTurn, GrammarPoint } from '../models/content';

export interface DialogueGrammarNoteItem {
  grammarId: string;
  title: string;
  pattern: string;
  explanation: string;
  accessibilityLabel: string;
}

export const createDialogueGrammarNoteItems = (
  turn: DialogueTurn,
  points: readonly GrammarPoint[],
): DialogueGrammarNoteItem[] => {
  const taggedGrammarIds = new Set(turn.grammarIds ?? []);
  const pointsById = new Map(points.map((point) => [point.id, point]));

  return (turn.grammarNotes ?? []).flatMap((note) => {
    if (!taggedGrammarIds.has(note.grammarId)) return [];

    const point = pointsById.get(note.grammarId);
    if (!point) return [];

    return [{
      grammarId: point.id,
      title: point.title,
      pattern: point.pattern,
      explanation: note.explanation,
      accessibilityLabel: `Grammar in this line: ${point.title}; ${point.pattern}`,
    }];
  });
};

export const toggleDialogueGrammarNote = (
  activeGrammarId: string | null,
  selectedGrammarId: string,
): string | null => activeGrammarId === selectedGrammarId ? null : selectedGrammarId;

export const resolveDialogueGrammarLanding = (
  requestedGrammarId: string | undefined,
  availableGrammarIds: readonly string[],
): string | null => requestedGrammarId && availableGrammarIds.includes(requestedGrammarId)
  ? requestedGrammarId
  : null;
