import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from './src/navigation/AppNavigator';
import { StudyProvider } from './src/state/StudyContext';

export default function App() {
  return (
    <View style={styles.canvas}>
      <View style={styles.appFrame}>
        <SafeAreaProvider>
          <StudyProvider>
            <StatusBar style="dark" />
            <AppNavigator />
          </StudyProvider>
        </SafeAreaProvider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#E8E0D2',
  },
  appFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 720,
    backgroundColor: '#F7F3EA',
    shadowColor: '#24302A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
});
