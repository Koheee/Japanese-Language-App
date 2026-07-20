export type LessonAvailability = 'ready' | 'outline';

export interface JapaneseExample {
  japanese: string;
  reading?: string;
  english: string;
}

export interface FurtherReading {
  title: string;
  url: string;
}

export interface GrammarFormation {
  label: string;
  formula: string;
  explanation: string;
}

export interface GrammarContrast {
  with: string;
  explanation: string;
}

export interface GrammarPoint {
  id: string;
  title: string;
  pattern: string;
  plainEnglish: string;
  explanation: string;
  whyItWorks: string;
  usageBoundary: string;
  formation: GrammarFormation[];
  contrast: GrammarContrast;
  beyondBasics?: string[];
  notes?: string[];
  examples: JapaneseExample[];
  furtherReading?: FurtherReading[];
  commonMistake?: {
    avoid: string;
    prefer: string;
    reason: string;
  };
}

export type VocabularySource = 'course' | 'personal-deck' | 'custom';

export interface VocabularyItem {
  id: string;
  japanese: string;
  reading: string;
  english: string;
  partOfSpeech: string;
  note?: string;
  example?: JapaneseExample;
  category?: string;
  source?: VocabularySource;
  sourceId?: string;
}

export interface DialogueGrammarNote {
  grammarId: string;
  explanation: string;
}

export interface DialogueTurn {
  id: string;
  speaker: string;
  japanese: string;
  reading: string;
  english: string;
  grammarIds?: string[];
  grammarNotes?: DialogueGrammarNote[];
}

interface BaseExercise {
  id: string;
  prompt: string;
  explanation: string;
}

export interface FillBlankExercise extends BaseExercise {
  type: 'fill-blank';
  sentence: string;
  acceptedAnswers: string[];
  hint?: string;
}

export interface TranslationExercise extends BaseExercise {
  type: 'translation';
  direction: 'en-ja' | 'ja-en';
  acceptedAnswers: string[];
  wordBank?: string[];
}

export interface ChoiceOption {
  id: string;
  label: string;
}

export interface MultipleChoiceExercise extends BaseExercise {
  type: 'multiple-choice';
  options: ChoiceOption[];
  correctOptionId: string;
}

export interface ListeningExercise extends BaseExercise {
  type: 'listening';
  audioId: string;
  audioPath: string;
  options: ChoiceOption[];
  correctOptionId: string;
  transcript: string;
}

export type Exercise =
  | FillBlankExercise
  | TranslationExercise
  | MultipleChoiceExercise
  | ListeningExercise;

export interface Lesson {
  id: string;
  number: number;
  title: string;
  japaneseTitle: string;
  description: string;
  durationMinutes: number;
  theme: string;
  availability: LessonAvailability;
  goals: string[];
  grammar: GrammarPoint[];
  vocabulary: VocabularyItem[];
  dialogue: DialogueTurn[];
  exercises: Exercise[];
}

export interface LessonOutline {
  id: string;
  number: number;
  title: string;
  japaneseTitle: string;
  summary: string;
  grammarFocus: string[];
  vocabularyTheme: string;
  availability: LessonAvailability;
}
