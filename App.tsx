import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HydrationGate } from './src/components/HydrationGate';
import { StorageErrorBanner } from './src/components/StorageErrorBanner';
import { getStorageErrorNavigatorOffset } from './src/components/storageErrorBannerLayout';
import { AppNavigator } from './src/navigation/AppNavigator';
import { StudyProvider, useStudy } from './src/state/StudyContext';

export default function App() {
  return (
    <View style={styles.canvas}>
      <View style={styles.appFrame}>
        <SafeAreaProvider>
          <StudyProvider>
            <HydrationGate>
              <StatusBar style="dark" />
              <ReadyApp />
            </HydrationGate>
          </StudyProvider>
        </SafeAreaProvider>
      </View>
    </View>
  );
}

function ReadyApp() {
  const { storageError } = useStudy();
  const [bannerBodyHeight, setBannerBodyHeight] = useState(0);
  const navigatorOffset = getStorageErrorNavigatorOffset(
    storageError !== null,
    bannerBodyHeight,
  );

  return (
    <View style={styles.readyApp}>
      {storageError
        ? <StorageErrorBanner onBodyHeightChange={setBannerBodyHeight} />
        : null}
      <View style={[styles.navigator, { paddingTop: navigatorOffset }]}>
        <AppNavigator />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readyApp: { flex: 1 },
  navigator: { flex: 1 },
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
