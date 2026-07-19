import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../theme/tokens';

interface StorageErrorBannerProps {
  onBodyHeightChange(height: number): void;
}

export function StorageErrorBanner({ onBodyHeightChange }: StorageErrorBannerProps) {
  const handleBodyLayout = (event: LayoutChangeEvent) => {
    onBodyHeightChange(event.nativeEvent.layout.height);
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={styles.safe}
    >
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
        onLayout={handleBodyLayout}
        style={styles.body}
      >
        <Text style={styles.message}>
          Changes could not be saved. Your previous saved state is still intact.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    position: 'absolute',
    zIndex: 1,
    top: 0,
    right: 0,
    left: 0,
    backgroundColor: colors.coralSoft,
  },
  body: {
    borderBottomColor: colors.error,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  message: {
    color: colors.error,
    fontSize: typography.small,
    fontWeight: '700',
    lineHeight: 19,
    textAlign: 'center',
  },
});
