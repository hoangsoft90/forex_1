import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRouter,
  useSegments,
} from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';

import { AuthProvider, useAuth } from '@/lib/auth-context';

function useProtectedRoute() {
  const router = useRouter();
  const segments = useSegments();
  const { loading, user, onboarding } = useAuth();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (!user) {
      // Chưa đăng nhập → bắt buộc vào nhóm auth
      if (!inAuthGroup) router.replace('/(auth)/login');
      return;
    }

    // Đã đăng nhập nhưng chưa hoàn tất onboarding → bắt buộc vào nhóm onboarding
    const needsOnboarding =
      !onboarding?.hasBalance ||
      !onboarding?.hasWeaknessProfile ||
      !onboarding?.hasRequiredRules;
    if (needsOnboarding && !inOnboardingGroup) {
      if (!onboarding?.hasBalance) router.replace('/(onboarding)/balance');
      else if (!onboarding?.hasWeaknessProfile) router.replace('/(onboarding)/quiz');
      else router.replace('/(onboarding)/constitution');
      return;
    }

    // Hoàn tất onboarding → vào nhóm chính (main)
    if (!needsOnboarding && (inAuthGroup || inOnboardingGroup)) {
      router.replace('/(main)');
    }
  }, [loading, user, onboarding, segments, router]);
}

function RootNavigator() {
  useProtectedRoute();
  const colorScheme = useColorScheme();
  const { loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(main)" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
