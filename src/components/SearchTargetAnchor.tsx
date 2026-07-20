import { forwardRef, type PropsWithChildren } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '../theme/tokens';

interface Props extends PropsWithChildren {
  accessibilityLabel?: string;
  highlighted: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
}

export const SearchTargetAnchor = forwardRef<View, Props>(function SearchTargetAnchor(
  { accessibilityLabel, children, highlighted, onLayout },
  ref,
) {
  return (
    <View
      accessible={highlighted}
      accessibilityLabel={highlighted ? accessibilityLabel : undefined}
      onLayout={onLayout}
      ref={ref}
      style={[styles.anchor, highlighted && styles.highlighted]}
    >
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  anchor: { width: '100%', borderRadius: radii.lg },
  highlighted: {
    padding: spacing.xs,
    borderWidth: 3,
    borderColor: colors.gold,
    backgroundColor: colors.goldSoft,
  },
});

