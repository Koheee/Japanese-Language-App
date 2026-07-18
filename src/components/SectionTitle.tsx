import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme/tokens';

export function SectionTitle({ eyebrow, title, detail }: { eyebrow?: string; title: string; detail?: string }) {
  return (
    <View style={styles.wrap}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <View style={styles.row}>
        <Text style={styles.title}>{title}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  eyebrow: { color: colors.coral, fontSize: typography.micro, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { flex: 1, color: colors.ink, fontSize: typography.title, fontWeight: '800', letterSpacing: -0.4 },
  detail: { color: colors.inkMuted, fontSize: typography.small, fontWeight: '600' },
});
