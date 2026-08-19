import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRouter,
  useSegments,
} from 'expo-router';
import { ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { I18nextProvider } from 'react-i18next';

import { GuidanceProvider } from '@/components/guidance-context';
import i18n, { resolveInitialLanguage } from '@/i18n';
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

/** Gate i18n: resolve ngôn ngữ khởi động (preference → thiết bị → vi) trước khi render màn hình. */
function I18nGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    resolveInitialLanguage().then((lang) => {
      if (!mounted) return;
      i18n.changeLanguage(lang).then(() => setReady(true));
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <I18nGate>
        {/* Guidance phải nằm TRÊN Stack để overlay spotlight phủ mọi màn hình */}
        <GuidanceProvider>
          <RootNavigator />
        </GuidanceProvider>
      </I18nGate>
    </AuthProvider>
  );
}
