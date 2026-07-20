import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { FlatList, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LessonCard } from '../components/LessonCard';
import { SearchButton } from '../components/SearchButton';
import { curriculum } from '../data/curriculum';
import { LearnStackParamList } from '../navigation/types';
import { colors, radii, spacing, typography } from '../theme/tokens';

type Props = NativeStackScreenProps<LearnStackParamList, 'Lessons'>;

export function LessonListScreen({ navigation }: Props) {
  const [isStandalone, setIsStandalone] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const displayMode = window.matchMedia('(display-mode: standalone)');
    const update = () => {
      const safariNavigator = window.navigator as Navigator & { standalone?: boolean };
      setIsStandalone(displayMode.matches || safariNavigator.standalone === true);
    };
    update();
    displayMode.addEventListener?.('change', update);
    return () => displayMode.removeEventListener?.('change', update);
  }, []);

  return (
    <View style={styles.screen}>
      <FlatList
        data={curriculum}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: 58 + insets.top,
          paddingBottom: spacing.huge + insets.bottom,
          paddingLeft: spacing.lg + insets.left,
          paddingRight: spacing.lg + insets.right,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.brand}>NIHONGO PATH</Text>
            <Text style={styles.kicker}>ことばを、ひとつずつ。</Text>
            <Text style={styles.title}>Your grammar reading path</Text>
            <Text style={styles.subtitle}>Twenty-five focused lessons from first introductions to real conditional conversations.</Text>

            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>25</Text>
                <Text style={styles.summaryLabel}>lessons</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>101</Text>
                <Text style={styles.summaryLabel}>grammar points</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>A1–A2</Text>
                <Text style={styles.summaryLabel}>reading path</Text>
              </View>
            </View>

            {Platform.OS === 'web' && !isStandalone ? (
              <View style={styles.installCard}>
                <View style={styles.installGlyph}><Text style={styles.installGlyphText}>↗</Text></View>
                <View style={styles.installCopy}>
                  <Text style={styles.installTitle}>Install on iPhone later</Text>
                  <Text style={styles.installBody}>Open the hosted link in Safari, tap Share, then choose “Add to Home Screen.”</Text>
                </View>
              </View>
            ) : null}

            <SearchButton onPress={() => navigation.navigate('Search')} />

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Lesson map</Text>
              <Text style={styles.sectionMeta}>Beginner · A1–A2</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <LessonCard
            lesson={item}
            onPress={() => navigation.navigate('LessonDetail', { lessonId: item.id })}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        ListFooterComponent={<Text style={styles.footer}>Original grammar curriculum · Built for clear, self-paced reading</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  header: { marginBottom: spacing.lg },
  brand: { color: colors.coral, fontSize: typography.micro, fontWeight: '900', letterSpacing: 2.2 },
  kicker: { marginTop: spacing.xl, color: colors.forest, fontSize: typography.small, fontWeight: '700' },
  title: { marginTop: spacing.xs, color: colors.ink, fontSize: typography.display, fontWeight: '900', letterSpacing: -1.2 },
  subtitle: { marginTop: spacing.md, maxWidth: 360, color: colors.inkMuted, fontSize: typography.body, lineHeight: 24 },
  summaryCard: { marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', padding: spacing.lg, backgroundColor: colors.forest, borderRadius: radii.lg },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryValue: { color: colors.white, fontSize: typography.title, fontWeight: '800' },
  summaryLabel: { color: colors.forestSoft, fontSize: typography.micro, fontWeight: '700' },
  divider: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.18)' },
  installCard: { marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, backgroundColor: colors.goldSoft, borderRadius: radii.lg },
  installGlyph: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.coral, borderRadius: 13 },
  installGlyphText: { color: colors.white, fontSize: typography.heading, fontWeight: '900' },
  installCopy: { flex: 1, gap: 2 },
  installTitle: { color: colors.ink, fontSize: typography.small, fontWeight: '900' },
  installBody: { color: colors.inkMuted, fontSize: typography.micro, lineHeight: 16 },
  sectionRow: { marginTop: spacing.xxl, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { color: colors.ink, fontSize: typography.title, fontWeight: '800' },
  sectionMeta: { color: colors.inkMuted, fontSize: typography.small },
  gap: { height: spacing.md },
  footer: { paddingTop: spacing.xxl, color: colors.inkMuted, fontSize: typography.micro, textAlign: 'center' },
});
