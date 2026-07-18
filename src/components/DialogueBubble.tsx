import { StyleSheet, Text, View } from 'react-native';

import { DialogueTurn } from '../models/content';
import { colors, radii, spacing, typography } from '../theme/tokens';

export function DialogueBubble({ turn, alignRight }: { turn: DialogueTurn; alignRight: boolean }) {
  return (
    <View style={[styles.wrap, alignRight && styles.wrapRight]}>
      <Text style={[styles.speaker, alignRight && styles.speakerRight]}>{turn.speaker}</Text>
      <View style={[styles.bubble, alignRight ? styles.bubbleRight : styles.bubbleLeft]}>
        <Text style={styles.japanese}>{turn.japanese}</Text>
        <Text style={styles.reading}>{turn.reading}</Text>
        <Text style={styles.english}>{turn.english}</Text>
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
});
