import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useState } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/shared/hooks/use-auth';
import { WorkshopProvider } from '@/features/workshop/context/WorkshopContext';
import { resetAppData } from '@/resetDB/reset';

// Toggle this to true to wipe all local data for testing
const SHOULD_RESET_DATA = true;

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isLoggedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isResetting, setIsResetting] = useState(__DEV__ && SHOULD_RESET_DATA);

  useEffect(() => {
    const performReset = async () => {
      if (__DEV__ && SHOULD_RESET_DATA) {
        console.log('🔄 [RootLayout] Data reset enabled, wiping data...');
        await resetAppData();
      }
      setIsResetting(false);
    };
    performReset();
  }, []);

  useEffect(() => {
    if (isResetting || isLoggedIn === null) return;

    const inAuthGroup = segments[0] === 'login';

    if (!isLoggedIn && !inAuthGroup) {
      // Redirect to the login page if not logged in
      router.replace('/login');
    } else if (isLoggedIn && inAuthGroup) {
      // Redirect away from the login page if logged in
      router.replace('/(tabs)');
    }
  }, [isLoggedIn, segments, router, isResetting]);

  if (isResetting) return null;

  return (
    <WorkshopProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="qrcode" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </WorkshopProvider>
  );
}
