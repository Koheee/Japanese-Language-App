import { StyleSheet, View } from 'react-native';

import { colors, radii } from '../theme/tokens';

export function ProgressBar({ value, accent = colors.coral }: { value: number; accent?: string }) {
  const safeValue = Math.max(0, Math.min(1, value));
  return (
    <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: safeValue * 100 }}>
      <View style={[styles.fill, { width: `${safeValue * 100}%`, backgroundColor: accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 7, backgroundColor: colors.surfaceStrong, borderRadius: radii.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill },
});
