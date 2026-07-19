import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseScreen } from '../screens/ExerciseScreen';
import { ImportPreviewScreen } from '../screens/ImportPreviewScreen';
import { LessonDetailScreen } from '../screens/LessonDetailScreen';
import { LessonListScreen } from '../screens/LessonListScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { ReviewScreen } from '../screens/ReviewScreen';
import { VocabularyManagerScreen } from '../screens/VocabularyManagerScreen';
import { WordEditorScreen } from '../screens/WordEditorScreen';
import { colors, typography } from '../theme/tokens';
import { LearnStackParamList, RootStackParamList, RootTabParamList } from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const LearnStack = createNativeStackNavigator<LearnStackParamList>();
const Tabs = createBottomTabNavigator<RootTabParamList>();

function LearnNavigator() {
  return (
    <LearnStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.paper } }}>
      <LearnStack.Screen name="Lessons" component={LessonListScreen} />
      <LearnStack.Screen name="LessonDetail" component={LessonDetailScreen} />
      <LearnStack.Screen name="Exercise" component={ExerciseScreen} options={{ gestureEnabled: false }} />
    </LearnStack.Navigator>
  );
}

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.forest,
    background: colors.paper,
    card: colors.surface,
    text: colors.ink,
    border: colors.line,
    notification: colors.coral,
  },
};

const tabGlyphs: Record<keyof RootTabParamList, string> = {
  Learn: '学',
  Review: '復',
  Progress: '歩',
};

function MainTabsNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.forest,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: [styles.tabBar, { height: 68 + insets.bottom, paddingBottom: Math.max(8, insets.bottom) }],
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => (
          <Text style={[styles.tabGlyph, focused && styles.tabGlyphActive]}>{tabGlyphs[route.name]}</Text>
        ),
      })}
    >
      <Tabs.Screen name="Learn" component={LearnNavigator} />
      <Tabs.Screen name="Review" component={ReviewScreen} />
      <Tabs.Screen name="Progress" component={ProgressScreen} />
    </Tabs.Navigator>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <RootStack.Navigator
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}
      >
        <RootStack.Screen name="MainTabs" component={MainTabsNavigator} />
        <RootStack.Screen
          name="VocabularyManager"
          component={VocabularyManagerScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <RootStack.Screen
          name="WordEditor"
          component={WordEditorScreen}
          options={{ presentation: 'modal' }}
        />
        <RootStack.Screen
          name="ImportPreview"
          component={ImportPreviewScreen}
          options={{ presentation: 'modal' }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: { paddingTop: 8, backgroundColor: colors.surface, borderTopColor: colors.line },
  tabLabel: { fontSize: typography.micro, fontWeight: '800' },
  tabGlyph: { color: colors.inkMuted, fontSize: 19, fontWeight: '700' },
  tabGlyphActive: { color: colors.coral },
});
