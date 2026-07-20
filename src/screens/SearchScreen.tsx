import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchResultCard } from '../components/SearchResultCard';
import type { LearnStackParamList } from '../navigation/types';
import type { SearchResult } from '../search/types';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { createSearchScreenPresentation } from './searchScreenModel';

type Props = NativeStackScreenProps<LearnStackParamList, 'Search'>;

let requestSequence = 0;
const nextRequestToken = () => {
  requestSequence += 1;
  return `search-${requestSequence}`;
};

export function SearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();
  const presentation = useMemo(() => createSearchScreenPresentation(query), [query]);

  const openResult = (result: SearchResult) => {
    navigation.push('LessonDetail', {
      lessonId: result.lessonId,
      searchTarget: {
        tab: result.kind,
        contentId: result.contentId,
        subsection: result.subsection,
        grammarId: result.grammarId,
        query: presentation.query,
        requestToken: nextRequestToken(),
      },
    });
  };

  return (
    <View style={styles.screen}>
      <FlatList
        contentContainerStyle={{
          paddingTop: spacing.md + insets.top,
          paddingBottom: spacing.xl + insets.bottom,
          paddingLeft: spacing.lg + insets.left,
          paddingRight: spacing.lg + insets.right,
        }}
        data={presentation.results}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(result) => result.id}
        ListEmptyComponent={presentation.mode === 'intro' ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Search the whole grammar path</Text>
            <Text style={styles.emptyBody}>Use Japanese, kana readings, or an English meaning.</Text>
            <View style={styles.examples}>
              {presentation.examples.map((example) => (
                <Pressable key={example} onPress={() => setQuery(example)} style={styles.exampleButton}>
                  <Text style={styles.exampleText}>{example}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No matches yet</Text>
            <Text style={styles.emptyBody}>Try a shorter Japanese pattern or an English meaning.</Text>
          </View>
        )}
        ListHeaderComponent={(
          <View style={styles.header}>
            <Pressable
              accessibilityHint="Returns to the previous page."
              accessibilityLabel="Back from search"
              accessibilityRole="button"
              onPress={navigation.goBack}
              style={styles.backButton}
            >
              <Text style={styles.backText}>‹  Back</Text>
            </Pressable>
            <Text style={styles.eyebrow}>ALL 25 LESSONS</Text>
            <Text style={styles.title}>Find a grammar note</Text>
            <Text style={styles.subtitle}>Search Japanese, kana readings, dialogue, and English explanations.</Text>
            <View style={styles.inputRow}>
              <TextInput
                accessibilityHint="Search Japanese, kana readings, and English explanations."
                accessibilityLabel="Search all lessons"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                onChangeText={setQuery}
                placeholder="Try より, てから, or permission"
                placeholderTextColor={colors.inkMuted}
                returnKeyType="search"
                style={styles.input}
                value={query}
              />
              {query ? (
                <Pressable
                  accessibilityLabel="Clear search"
                  accessibilityRole="button"
                  onPress={() => setQuery('')}
                  style={styles.clearButton}
                >
                  <Text style={styles.clearText}>×</Text>
                </Pressable>
              ) : null}
            </View>
            <Text accessibilityLiveRegion="polite" style={styles.resultCount}>
              {presentation.resultAnnouncement}
            </Text>
          </View>
        )}
        renderItem={({ item }) => <SearchResultCard result={item} onPress={() => openResult(item)} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  header: { gap: spacing.md, marginBottom: spacing.xl },
  backButton: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingRight: spacing.lg },
  backText: { color: colors.forest, fontSize: typography.small, fontWeight: '800' },
  eyebrow: { color: colors.coral, fontSize: typography.micro, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: typography.display, fontWeight: '900', letterSpacing: -1 },
  subtitle: { color: colors.inkMuted, fontSize: typography.body, lineHeight: 24 },
  inputRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.forest,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  input: { minHeight: 52, flex: 1, paddingHorizontal: spacing.lg, color: colors.ink, fontSize: typography.body },
  clearButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  clearText: { color: colors.coral, fontSize: typography.heading, fontWeight: '900' },
  resultCount: { color: colors.inkMuted, fontSize: typography.micro, fontWeight: '700' },
  gap: { height: spacing.md },
  emptyCard: { gap: spacing.md, padding: spacing.xl, borderRadius: radii.lg, backgroundColor: colors.surfaceStrong },
  emptyTitle: { color: colors.ink, fontSize: typography.heading, fontWeight: '900' },
  emptyBody: { color: colors.inkMuted, fontSize: typography.small, lineHeight: 21 },
  examples: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  exampleButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radii.md, backgroundColor: colors.coralSoft },
  exampleText: { color: colors.coral, fontSize: typography.small, fontWeight: '900' },
});

