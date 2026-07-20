import { describe, expect, it } from 'vitest';

import type { DialogueTurn, GrammarPoint } from '../models/content';
import {
  createDialogueGrammarNoteItems,
  toggleDialogueGrammarNote,
} from './dialogueGrammarNotesModel';

const point = (id: string, title: string, pattern: string): GrammarPoint => ({
  id,
  title,
  pattern,
  plainEnglish: 'Meaning',
  explanation: 'Explanation',
  whyItWorks: 'Mental model',
  usageBoundary: 'Boundary',
  formation: [{ label: 'Form', formula: pattern, explanation: 'Build it.' }],
  contrast: { with: 'Another form', explanation: 'Contrast.' },
  examples: [{ japanese: 'れいです。', english: 'It is an example.' }],
});

describe('createDialogueGrammarNoteItems', () => {
  it('resolves tagged notes against the lesson grammar in authored note order', () => {
    const points = [
      point('l1-topic-copula', 'Make a noun the topic, then identify it', 'A は B です'),
      point('l1-polite-question', 'Turn a statement into a polite question', '〜ですか'),
    ];
    const turn: DialogueTurn = {
      id: 'l1-d01',
      speaker: 'Mina',
      japanese: 'ミナは 学生ですか。',
      reading: 'ミナは がくせいですか。',
      english: 'Is Mina a student?',
      grammarIds: ['l1-topic-copula', 'l1-polite-question'],
      grammarNotes: [
        { grammarId: 'l1-polite-question', explanation: 'か makes this a neutral, polite question.' },
        { grammarId: 'l1-topic-copula', explanation: 'は frames Mina before 学生です identifies her.' },
      ],
    };

    expect(createDialogueGrammarNoteItems(turn, points)).toEqual([
      {
        grammarId: 'l1-polite-question',
        title: 'Turn a statement into a polite question',
        pattern: '〜ですか',
        explanation: turn.grammarNotes![0]!.explanation,
        accessibilityLabel: 'Grammar in this line: Turn a statement into a polite question; 〜ですか',
      },
      {
        grammarId: 'l1-topic-copula',
        title: 'Make a noun the topic, then identify it',
        pattern: 'A は B です',
        explanation: turn.grammarNotes![1]!.explanation,
        accessibilityLabel: 'Grammar in this line: Make a noun the topic, then identify it; A は B です',
      },
    ]);
  });

  it('omits untagged notes and notes that cannot resolve inside the supplied lesson', () => {
    const points = [
      point('l1-topic-copula', 'Topic and identity', 'A は B です'),
      point('l1-known-but-untagged', 'Known but untagged', 'N も'),
    ];
    const turn: DialogueTurn = {
      id: 'l1-d02',
      speaker: 'Noah',
      japanese: 'ノアは 会社員です。',
      reading: 'ノアは かいしゃいんです。',
      english: 'Noah is an office worker.',
      grammarIds: ['l1-topic-copula', 'l2-not-in-this-lesson'],
      grammarNotes: [
        { grammarId: 'l1-known-but-untagged', explanation: 'This note does not match a turn tag.' },
        { grammarId: 'l2-not-in-this-lesson', explanation: 'This tag has no point in this lesson.' },
        { grammarId: 'l1-topic-copula', explanation: 'The topic comes first, then the identity.' },
      ],
    };

    expect(createDialogueGrammarNoteItems(turn, points)).toEqual([
      {
        grammarId: 'l1-topic-copula',
        title: 'Topic and identity',
        pattern: 'A は B です',
        explanation: 'The topic comes first, then the identity.',
        accessibilityLabel: 'Grammar in this line: Topic and identity; A は B です',
      },
    ]);
  });

  it('returns an empty projection when the turn has no usable annotations', () => {
    const bareTurn: DialogueTurn = {
      id: 'l1-d03',
      speaker: 'Mina',
      japanese: 'はい。',
      reading: 'はい。',
      english: 'Yes.',
    };
    const incompleteTurn: DialogueTurn = {
      ...bareTurn,
      grammarIds: ['l1-topic-copula'],
      grammarNotes: [],
    };

    expect(createDialogueGrammarNoteItems(bareTurn, [])).toEqual([]);
    expect(createDialogueGrammarNoteItems(incompleteTurn, [
      point('l1-topic-copula', 'Topic and identity', 'A は B です'),
    ])).toEqual([]);
  });

  it('does not mutate the turn, note order, or lesson grammar inventory', () => {
    const points = [
      point('l1-topic-copula', 'Topic and identity', 'A は B です'),
      point('l1-polite-question', 'Polite question', '〜ですか'),
    ];
    const turn: DialogueTurn = {
      id: 'l1-d04',
      speaker: 'Noah',
      japanese: 'ノアは 先生ですか。',
      reading: 'ノアは せんせいですか。',
      english: 'Is Noah a teacher?',
      grammarIds: ['l1-topic-copula', 'l1-polite-question'],
      grammarNotes: [
        { grammarId: 'l1-topic-copula', explanation: 'The line frames Noah as its topic.' },
        { grammarId: 'l1-polite-question', explanation: 'か asks for confirmation.' },
      ],
    };
    const pointsBefore = structuredClone(points);
    const turnBefore = structuredClone(turn);

    createDialogueGrammarNoteItems(turn, points);

    expect(points).toEqual(pointsBefore);
    expect(turn).toEqual(turnBefore);
  });
});

describe('toggleDialogueGrammarNote', () => {
  it('opens a note, replaces it with a newer choice, and collapses the active choice', () => {
    const first = toggleDialogueGrammarNote(null, 'l1-topic-copula');
    const replaced = toggleDialogueGrammarNote(first, 'l1-polite-question');
    const collapsed = toggleDialogueGrammarNote(replaced, 'l1-polite-question');

    expect(first).toBe('l1-topic-copula');
    expect(replaced).toBe('l1-polite-question');
    expect(collapsed).toBeNull();
  });
});
