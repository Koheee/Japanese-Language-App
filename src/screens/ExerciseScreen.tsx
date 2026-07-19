import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { ProgressBar } from '../components/ProgressBar';
import { Screen } from '../components/Screen';
import { getLesson } from '../data/lessons';
import { ChoiceOption, Exercise } from '../models/content';
import { LearnStackParamList } from '../navigation/types';
import { checkExerciseAnswer, getAnswerLabel } from '../services/exerciseEngine';
import { createActionLock } from '../state/appStateCommitter';
import { useStudy } from '../state/StudyContext';
import { colors, radii, spacing, typography } from '../theme/tokens';

type Props = NativeStackScreenProps<LearnStackParamList, 'Exercise'>;

const typeLabels: Record<Exercise['type'], string> = {
  'fill-blank': 'COMPLETE THE SENTENCE',
  translation: 'TRANSLATE',
  'multiple-choice': 'CHOOSE THE BEST ANSWER',
  listening: 'LISTEN FOR MEANING',
};

export function ExerciseScreen({ navigation, route }: Props) {
  const lesson = getLesson(route.params.lessonId);
  const { getProgress, recordExercise } = useStudy();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [response, setResponse] = useState('');
  const [checked, setChecked] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const submitLockRef = useRef<ReturnType<typeof createActionLock> | null>(null);
  const submitLock = submitLockRef.current ??= createActionLock();
  const lessonProgress = getProgress(route.params.lessonId);

  const exercise = lesson?.exercises[currentIndex];
  const total = lesson?.exercises.length ?? 0;
  const progress = finished ? 1 : currentIndex / Math.max(total, 1);

  const answerLabel = useMemo(
    () => exercise ? getAnswerLabel(exercise) : '',
    [exercise],
  );

  if (!lesson || !exercise || lessonProgress?.started !== true) return null;

  const check = async () => {
    if (!response.trim() || checked) return;
    const work = submitLock.tryRun(async () => {
      const submittedResponse = response;
      const submittedExercise = exercise;
      setIsSaving(true);
      try {
        const correct = checkExerciseAnswer(submittedExercise, submittedResponse);
        const result = await recordExercise(
          lesson.id,
          submittedExercise.id,
          correct,
        );
        if (result.ok) {
          setResponse(submittedResponse);
          setChecked(true);
          setWasCorrect(correct);
          if (correct) setScore((current) => current + 1);
        }
      } finally {
        setIsSaving(false);
      }
    });
    if (work) await work;
  };

  const next = () => {
    if (currentIndex === total - 1) {
      setFinished(true);
      return;
    }
    setCurrentIndex((current) => current + 1);
    setResponse('');
    setChecked(false);
    setWasCorrect(false);
    setAudioPlayed(false);
  };

  if (finished) {
    const percentage = Math.round((score / total) * 100);
    return (
      <Screen scroll contentStyle={styles.finishPage}>
        <View style={styles.finishMark}><Text style={styles.finishKanji}>よく</Text></View>
        <Text style={styles.finishEyebrow}>LESSON {String(lesson.number).padStart(2, '0')} · PRACTICE COMPLETE</Text>
        <Text style={styles.finishTitle}>{percentage >= 75 ? 'Nicely retrieved.' : 'A useful first pass.'}</Text>
        <Text style={styles.finishBody}>You answered {score} of {total} correctly. The lesson’s words and grammar are now in your review deck, where missed ideas will return sooner.</Text>

        <View style={styles.scoreCard}>
          <Text style={styles.scoreValue}>{percentage}%</Text>
          <View style={styles.scoreCopy}>
            <Text style={styles.scoreTitle}>Practice accuracy</Text>
            <ProgressBar value={score / total} />
            <Text style={styles.scoreNote}>{percentage >= 75 ? 'Ready for spaced review' : 'Review the explanations, then try once more'}</Text>
          </View>
        </View>

        <View style={styles.nextSteps}>
          <Text style={styles.nextTitle}>What happens next?</Text>
          <Text style={styles.nextBody}>Review cards begin due now. Rate honestly: “Again” is not a failure—it simply brings a card back while the memory is still warm.</Text>
        </View>

        <PrimaryButton label="Review due cards" onPress={() => navigation.getParent()?.navigate('Review')} />
        <PrimaryButton label="Back to lesson" variant="secondary" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  return (
    <Screen scroll contentStyle={styles.page}>
      <View style={styles.topBar}>
        <Pressable onPress={navigation.goBack} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>
        <View style={styles.topProgress}><ProgressBar value={progress} /><Text style={styles.counter}>{currentIndex + 1} / {total}</Text></View>
      </View>

      <View style={styles.promptBlock}>
        <Text style={styles.typeLabel}>{typeLabels[exercise.type]}</Text>
        <Text style={styles.prompt}>{exercise.prompt}</Text>
      </View>

      <View style={styles.answerArea}>
        {exercise.type === 'fill-blank' ? (
          <>
            <View style={styles.sentenceCard}><Text style={styles.sentence}>{exercise.sentence}</Text></View>
            {exercise.hint ? <Text style={styles.hint}>Hint · {exercise.hint}</Text> : null}
            <TextInput
              value={response}
              onChangeText={setResponse}
              editable={!checked && !isSaving}
              placeholder="Type the missing word"
              placeholderTextColor={colors.inkMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </>
        ) : null}

        {exercise.type === 'translation' ? (
          <>
            {exercise.wordBank ? (
              <View style={styles.wordBank}>
                {exercise.wordBank.map((word) => (
                  <Pressable key={word} disabled={checked || isSaving} onPress={() => setResponse((value) => `${value}${word}`)} style={styles.wordToken}>
                    <Text style={styles.wordTokenText}>{word}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <TextInput
              value={response}
              onChangeText={setResponse}
              editable={!checked && !isSaving}
              multiline
              placeholder={exercise.direction === 'en-ja' ? 'Type in Japanese' : 'Type in English'}
              placeholderTextColor={colors.inkMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, styles.translationInput]}
            />
          </>
        ) : null}

        {exercise.type === 'multiple-choice' ? (
          <ChoiceList options={exercise.options} selected={response} disabled={checked || isSaving} onSelect={setResponse} />
        ) : null}

        {exercise.type === 'listening' ? (
          <>
            <Pressable
              disabled={checked || isSaving}
              onPress={() => {
                setAudioPlayed(true);
                Alert.alert('Audio placeholder', `Connect recorded audio to:\n${exercise.audioPath}`);
              }}
              style={[styles.audioCard, audioPlayed && styles.audioCardPlayed]}
            >
              <View style={styles.play}><Text style={styles.playIcon}>{audioPlayed ? '↻' : '▶'}</Text></View>
              <View style={styles.waveform}>
                {[12, 22, 34, 18, 29, 38, 16, 27, 20, 33, 14].map((height, index) => <View key={index} style={[styles.wave, { height }]} />)}
              </View>
              <Text style={styles.audioText}>{audioPlayed ? 'Play again' : 'Play clip'}</Text>
            </Pressable>
            <ChoiceList options={exercise.options} selected={response} disabled={checked || isSaving} onSelect={setResponse} />
          </>
        ) : null}
      </View>

      {checked ? (
        <View style={[styles.feedback, wasCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect]}>
          <Text style={[styles.feedbackTitle, wasCorrect ? styles.correctText : styles.incorrectText]}>{wasCorrect ? '○  That’s it' : '△  Not quite yet'}</Text>
          {!wasCorrect ? <Text style={styles.answerText}>Answer · {answerLabel}</Text> : null}
          {exercise.type === 'listening' ? <Text style={styles.transcript}>Heard · {exercise.transcript}</Text> : null}
          <Text style={styles.feedbackBody}>{exercise.explanation}</Text>
        </View>
      ) : null}

      <View style={styles.action}>
        <PrimaryButton
          label={isSaving ? 'Saving…' : checked ? (currentIndex === total - 1 ? 'See results' : 'Continue') : 'Check answer'}
          disabled={isSaving || (!checked && !response.trim())}
          onPress={checked ? next : check}
        />
      </View>
    </Screen>
  );
}

function ChoiceList({ options, selected, disabled, onSelect }: { options: ChoiceOption[]; selected: string; disabled: boolean; onSelect: (id: string) => void }) {
  return (
    <View style={styles.choices}>
      {options.map((option, index) => {
        const active = option.id === selected;
        return (
          <Pressable key={option.id} disabled={disabled} onPress={() => onSelect(option.id)} style={[styles.choice, active && styles.choiceActive]}>
            <View style={[styles.choiceMarker, active && styles.choiceMarkerActive]}><Text style={[styles.choiceLetter, active && styles.choiceLetterActive]}>{String.fromCharCode(65 + index)}</Text></View>
            <Text style={[styles.choiceLabel, active && styles.choiceLabelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.surfaceStrong },
  closeText: { color: colors.inkMuted, fontSize: 27, fontWeight: '400', lineHeight: 29 },
  topProgress: { flex: 1, gap: spacing.xs },
  counter: { color: colors.inkMuted, fontSize: typography.micro, fontWeight: '700', textAlign: 'right' },
  promptBlock: { marginTop: spacing.huge, gap: spacing.md },
  typeLabel: { color: colors.coral, fontSize: typography.micro, fontWeight: '900', letterSpacing: 1.4 },
  prompt: { color: colors.ink, fontSize: typography.title, fontWeight: '800', lineHeight: 32 },
  answerArea: { marginTop: spacing.xxl, gap: spacing.lg },
  sentenceCard: { minHeight: 100, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.forestSoft, borderRadius: radii.lg },
  sentence: { color: colors.ink, fontSize: typography.title, fontWeight: '800', textAlign: 'center' },
  hint: { color: colors.inkMuted, fontSize: typography.small, lineHeight: 19 },
  input: { minHeight: 56, paddingHorizontal: spacing.lg, color: colors.ink, fontSize: typography.body, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.line },
  translationInput: { minHeight: 110, paddingTop: spacing.lg, textAlignVertical: 'top' },
  wordBank: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  wordToken: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.line },
  wordTokenText: { color: colors.forest, fontSize: typography.body, fontWeight: '700' },
  choices: { gap: spacing.md },
  choice: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.line },
  choiceActive: { backgroundColor: colors.forestSoft, borderColor: colors.forest },
  choiceMarker: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, backgroundColor: colors.surfaceStrong },
  choiceMarkerActive: { backgroundColor: colors.forest },
  choiceLetter: { color: colors.inkMuted, fontSize: typography.small, fontWeight: '800' },
  choiceLetterActive: { color: colors.white },
  choiceLabel: { flex: 1, color: colors.ink, fontSize: typography.body, lineHeight: 23 },
  choiceLabelActive: { color: colors.forest, fontWeight: '700' },
  audioCard: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl, backgroundColor: colors.forest, borderRadius: radii.lg },
  audioCardPlayed: { backgroundColor: '#3B6B57' },
  play: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.coral },
  playIcon: { color: colors.white, fontSize: typography.heading, fontWeight: '800' },
  waveform: { height: 40, flexDirection: 'row', alignItems: 'center', gap: 5 },
  wave: { width: 3, backgroundColor: colors.forestSoft, borderRadius: radii.pill },
  audioText: { color: colors.white, fontSize: typography.small, fontWeight: '800' },
  feedback: { marginTop: spacing.xl, padding: spacing.lg, gap: spacing.sm, borderRadius: radii.lg },
  feedbackCorrect: { backgroundColor: colors.forestSoft },
  feedbackIncorrect: { backgroundColor: colors.coralSoft },
  feedbackTitle: { fontSize: typography.heading, fontWeight: '900' },
  correctText: { color: colors.success },
  incorrectText: { color: colors.error },
  answerText: { color: colors.ink, fontSize: typography.body, fontWeight: '800' },
  transcript: { color: colors.forest, fontSize: typography.small, fontWeight: '700' },
  feedbackBody: { color: colors.ink, fontSize: typography.small, lineHeight: 21 },
  action: { marginTop: 'auto', paddingTop: spacing.xxl },
  finishPage: { flexGrow: 1, alignItems: 'stretch', paddingHorizontal: spacing.xl, paddingTop: spacing.huge, paddingBottom: spacing.xxl },
  finishMark: { alignSelf: 'center', width: 96, height: 96, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.coral, borderRadius: 32, transform: [{ rotate: '-4deg' }] },
  finishKanji: { color: colors.white, fontSize: typography.title, fontWeight: '900' },
  finishEyebrow: { marginTop: spacing.xxl, color: colors.forest, fontSize: typography.micro, fontWeight: '900', letterSpacing: 1.3, textAlign: 'center' },
  finishTitle: { marginTop: spacing.sm, color: colors.ink, fontSize: typography.display, fontWeight: '900', textAlign: 'center' },
  finishBody: { marginTop: spacing.md, color: colors.inkMuted, fontSize: typography.body, lineHeight: 24, textAlign: 'center' },
  scoreCard: { marginTop: spacing.xxl, flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line },
  scoreValue: { color: colors.coral, fontSize: 40, fontWeight: '900' },
  scoreCopy: { flex: 1, gap: spacing.sm },
  scoreTitle: { color: colors.ink, fontSize: typography.small, fontWeight: '800' },
  scoreNote: { color: colors.inkMuted, fontSize: typography.micro },
  nextSteps: { marginVertical: spacing.xl, padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.goldSoft, borderRadius: radii.md },
  nextTitle: { color: colors.ink, fontSize: typography.heading, fontWeight: '800' },
  nextBody: { color: colors.inkMuted, fontSize: typography.small, lineHeight: 20 },
});
