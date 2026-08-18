import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import AdBanner from '@/components/ad-banner';
import { initAdMob } from '@/lib/admob';
import { configureNotificationHandler } from '@/lib/notification-manager';

export default function MainLayout() {
  const { t } = useTranslation();
  useEffect(() => {
    // Khởi tạo AdMob 1 lần (register test device) khi nhóm main mount.
    initAdMob();
    // Notification hiển thị cả khi app foreground (Module 8).
    configureNotificationHandler();
  }, []);
  return (
    <View style={styles.container}>
      <View style={styles.stack}>
        <Stack screenOptions={{ headerTitle: t('mainLayout.settings') }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="settings"
            options={{ headerShown: true, title: t('mainLayout.settings') }}
          />
          <Stack.Screen
            name="constitution-settings"
            options={{ headerShown: true, title: t('mainLayout.constitution') }}
          />
          <Stack.Screen
            name="discipline-explainer"
            options={{ headerShown: true, title: t('mainLayout.disciplineVsEdge') }}
          />
          <Stack.Screen
            name="new-plan"
            options={{ headerShown: true, title: t('mainLayout.newPlan') }}
          />
          <Stack.Screen
            name="confirm-no-plan"
            options={{ headerShown: true, title: t('mainLayout.noPlan') }}
          />
          <Stack.Screen
            name="execution-widget"
            options={{ headerShown: true, title: t('mainLayout.executionWidget') }}
          />
          <Stack.Screen
            name="paste-mt4"
            options={{ headerShown: true, title: t('mainLayout.pasteMt4') }}
          />
          <Stack.Screen
            name="journal"
            options={{ headerShown: true, title: t('mainLayout.journal') }}
          />
          <Stack.Screen
            name="trade-detail"
            options={{ headerShown: true, title: t('mainLayout.tradeDetail') }}
          />
          <Stack.Screen
            name="scores"
            options={{ headerShown: true, title: t('mainLayout.scores') }}
          />
          <Stack.Screen
            name="weekly-audit"
            options={{ headerShown: true, title: t('mainLayout.weeklyAudit') }}
          />
          <Stack.Screen
            name="pro"
            options={{ headerShown: true, title: t('mainLayout.pro') }}
          />
          <Stack.Screen
            name="portfolio-risk"
            options={{ headerShown: true, title: t('mainLayout.portfolioRisk') }}
          />
          <Stack.Screen
            name="setup-analytics"
            options={{ headerShown: true, title: t('mainLayout.setupAnalytics') }}
          />
          <Stack.Screen
            name="danger-zone"
            options={{ headerShown: true, title: t('mainLayout.dangerZone') }}
          />
        </Stack>
      </View>
      {/* Bottom banner ads — luôn hiển thị ở đáy, an toàn với 3 nút Android */}
      <AdBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  stack: { flex: 1 },
});
