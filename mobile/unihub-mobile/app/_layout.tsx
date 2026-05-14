import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/shared/hooks/use-auth';
import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

export const unstable_settings = {
  anchor: '(tabs)',
};

import { WorkshopProvider } from '@/features/workshop/context/WorkshopContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isLoggedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn === null) return;

    const inAuthGroup = segments[0] === 'login';

    if (!isLoggedIn && !inAuthGroup) {
      // Redirect to the login page if not logged in
      router.replace('/login');
    } else if (isLoggedIn && inAuthGroup) {
      // Redirect away from the login page if logged in
      router.replace('/(tabs)');
    }
  }, [isLoggedIn, segments]);

  return (
    <WorkshopProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </WorkshopProvider>
  );
}
