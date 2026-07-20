import { StyleSheet, Text, View } from 'react-native';

import type { DialogueTurn, GrammarPoint } from '../models/content';
import { highlightSearchText } from '../search/searchLessons';
import type { SearchSubsection } from '../search/types';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { DialogueGrammarNotes } from './DialogueGrammarNotes';

const renderSegments = (text: string, query: string) => highlightSearchText(text, query).map((segment, index) => (
  <Text key={`${index}-${segment.text}`} style={segment.highlighted ? styles.highlighted : undefined}>
    {segment.text}
  </Text>
));

interface DialogueSearchLanding {
  query: string;
  subsection: SearchSubsection;
  grammarId?: string;
  requestToken: string;
}

interface Props {
  turn: DialogueTurn;
  grammar: readonly GrammarPoint[];
  alignRight: boolean;
  searchLanding?: DialogueSearchLanding;
}

export function DialogueBubble({ turn, grammar, alignRight, searchLanding }: Props) {
  const lineQuery = searchLanding?.subsection === 'dialogue-line' ? searchLanding.query : undefined;
  const grammarNoteQuery = searchLanding?.subsection === 'grammar-note' ? searchLanding.query : undefined;

  return (
    <View style={[styles.wrap, alignRight && styles.wrapRight]}>
      <Text style={[styles.speaker, alignRight && styles.speakerRight]}>
        {lineQuery ? renderSegments(turn.speaker, lineQuery) : turn.speaker}
      </Text>
      <View style={[styles.bubble, alignRight ? styles.bubbleRight : styles.bubbleLeft]}>
        <Text style={styles.japanese}>{lineQuery ? renderSegments(turn.japanese, lineQuery) : turn.japanese}</Text>
        <Text style={styles.reading}>{lineQuery ? renderSegments(turn.reading, lineQuery) : turn.reading}</Text>
        <Text style={styles.english}>{lineQuery ? renderSegments(turn.english, lineQuery) : turn.english}</Text>
        <DialogueGrammarNotes
          grammar={grammar}
          highlightQuery={grammarNoteQuery}
          initialGrammarId={grammarNoteQuery ? searchLanding?.grammarId : undefined}
          landingRequestToken={grammarNoteQuery ? searchLanding?.requestToken : undefined}
          turn={turn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', alignItems: 'flex-start', gap: spacing.xs },
  wrapRight: { alignItems: 'flex-end' },
  speaker: { marginLeft: spacing.sm, color: colors.inkMuted, fontSize: typography.micro, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  speakerRight: { marginLeft: 0, marginRight: spacing.sm },
  bubble: { width: '88%', padding: spacing.lg, gap: spacing.xs, borderRadius: radii.lg },
  bubbleLeft: { backgroundColor: colors.surface, borderTopLeftRadius: spacing.xs, borderWidth: 1, borderColor: colors.line },
  bubbleRight: { backgroundColor: colors.forestSoft, borderTopRightRadius: spacing.xs },
  japanese: { color: colors.ink, fontSize: typography.body, fontWeight: '700', lineHeight: 25 },
  reading: { color: colors.forest, fontSize: typography.small, lineHeight: 19 },
  english: { color: colors.inkMuted, fontSize: typography.small, lineHeight: 19 },
  highlighted: {
    backgroundColor: colors.goldSoft,
    color: colors.ink,
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
});
