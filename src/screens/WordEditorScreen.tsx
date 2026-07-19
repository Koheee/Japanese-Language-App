import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '../navigation/types';
import { colors, spacing, typography } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'WordEditor'>;

export function WordEditorScreen({ navigation }: Props) {
  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safe}>
      <Pressable
        accessibilityHint="Closes the word editor without making changes"
        accessibilityLabel="Cancel word editing"
        accessibilityRole="button"
        onPress={navigation.goBack}
        style={styles.control}
      >
        <Text style={styles.controlText}>Cancel</Text>
      </Pressable>
      <View style={styles.body}>
        <Text accessibilityRole="header" style={styles.title}>Word editor</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: spacing.lg },
  control: { minHeight: 44, minWidth: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  controlText: { color: colors.forest, fontSize: typography.body, fontWeight: '800' },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { color: colors.ink, fontSize: typography.title, fontWeight: '900' },
});
