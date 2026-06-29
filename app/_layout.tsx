import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from '../src/context/ThemeContext';
import { SubscriptionProvider, useSubscription } from '../src/context/SubscriptionContext';
import { UpgradeModal } from '../src/components/UpgradeModal';

function GlobalUpgradeModal() {
  const { showModal, setShowModal, modalFeature } = useSubscription();
  return (
    <UpgradeModal 
      visible={showModal} 
      onClose={() => setShowModal(false)} 
      feature={modalFeature} 
    />
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <SubscriptionProvider>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(drawer)" />
          </Stack>
          <GlobalUpgradeModal />
          <StatusBar style="auto" />
        </SubscriptionProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
