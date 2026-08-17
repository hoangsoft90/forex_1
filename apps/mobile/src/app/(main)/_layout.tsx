import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import AdBanner from '@/components/ad-banner';
import { initAdMob } from '@/lib/admob';

export default function MainLayout() {
  useEffect(() => {
    // Khởi tạo AdMob 1 lần (register test device) khi nhóm main mount.
    initAdMob();
  }, []);
  return (
    <View style={styles.container}>
      <View style={styles.stack}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="settings"
            options={{ headerShown: true, title: 'Cài đặt' }}
          />
          <Stack.Screen
            name="constitution-settings"
            options={{ headerShown: true, title: 'Hiến pháp giao dịch' }}
          />
          <Stack.Screen
            name="discipline-explainer"
            options={{ headerShown: true, title: 'Discipline vs Edge' }}
          />
          <Stack.Screen
            name="new-plan"
            options={{ headerShown: true, title: 'Tạo Trade Plan' }}
          />
          <Stack.Screen
            name="confirm-no-plan"
            options={{ headerShown: true, title: 'Lệnh ngoài kế hoạch' }}
          />
          <Stack.Screen
            name="execution-widget"
            options={{ headerShown: true, title: 'Nhập lệnh nhanh' }}
          />
          <Stack.Screen
            name="paste-mt4"
            options={{ headerShown: true, title: 'Paste MT4/MT5' }}
          />
          <Stack.Screen
            name="journal"
            options={{ headerShown: true, title: 'Journal' }}
          />
          <Stack.Screen
            name="trade-detail"
            options={{ headerShown: true, title: 'Chi tiết lệnh' }}
          />
          <Stack.Screen
            name="scores"
            options={{ headerShown: true, title: 'Điểm số' }}
          />
          <Stack.Screen
            name="weekly-audit"
            options={{ headerShown: true, title: 'Weekly Audit' }}
          />
          <Stack.Screen
            name="pro"
            options={{ headerShown: true, title: 'Mở Pro' }}
          />
          <Stack.Screen
            name="portfolio-risk"
            options={{ headerShown: true, title: 'Rủi ro danh mục' }}
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
