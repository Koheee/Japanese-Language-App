import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LessonDetailScreen } from '../screens/LessonDetailScreen';
import { LessonListScreen } from '../screens/LessonListScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { colors } from '../theme/tokens';
import { LearnStackParamList } from './types';

const LearnStack = createNativeStackNavigator<LearnStackParamList>();

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

export function AppNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <LearnStack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.paper },
        }}
      >
        <LearnStack.Screen name="Lessons" component={LessonListScreen} />
        <LearnStack.Screen name="LessonDetail" component={LessonDetailScreen} />
        <LearnStack.Screen name="Search" component={SearchScreen} />
      </LearnStack.Navigator>
    </NavigationContainer>
  );
}
