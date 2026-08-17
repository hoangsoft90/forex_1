import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { isAdmobConfigured } from '@/lib/admob';
import { safeBack } from '@/lib/navigation';
import { unlockProViaAd } from '@/lib/pro-unlock';
import { formatHoursLeft, getProStatus } from '@/lib/tier';

export default function ProScreen() {
  const router = useRouter();
  const { tier, subscriptionExpiresAt, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const status = getProStatus(tier, subscriptionExpiresAt);
  const admobReady = isAdmobConfigured();

  async function handleWatchAd() {
    setLoading(true);
    setMessage(null);
    const result = await unlockProViaAd();
    setLoading(false);
    if (result.ok) {
      setMessage(`🎉 Đã mở Pro 24h (đến ${new Date(result.expiresAt).toLocaleString('vi-VN')}).`);
      await refreshProfile();
    } else {
      setMessage(result.reason);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mở Pro</Text>

      {status.isPro ? (
        <View style={styles.proCard}>
          <Text style={styles.proBadge}>● BẠN ĐANG PRO</Text>
          <Text style={styles.proText}>
            Còn {formatHoursLeft(status.hoursLeft)}. Mở thêm 24h bằng cách xem 1 quảng cáo.
          </Text>
        </View>
      ) : (
        <View style={styles.freeCard}>
          <Text style={styles.proBadgeMuted}>● BẠN ĐANG Ở GÓI FREE</Text>
          <Text style={styles.proText}>
            Pro mở khóa: biểu đồ xu hướng Discipline Score, ma trận tương quan danh mục,
            và Adaptive Rules. Xem 1 quảng cáo ngắn để dùng thử 24 giờ.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, (loading || !admobReady) && styles.buttonDisabled]}
        onPress={handleWatchAd}
        disabled={loading || !admobReady}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {admobReady ? '▶ Xem quảng cáo — mở Pro 24h' : 'Quảng cáo chưa được cấu hình'}
          </Text>
        )}
      </TouchableOpacity>

      {!admobReady ? (
        <Text style={styles.hint}>
          App đang chạy chế độ chưa cấu hình AdMob (thiếu App ID / Ad Unit ID). Thêm biến{' '}
          {'EXPO_PUBLIC_ADMOB_APP_ID'} và {'EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID'} rồi build lại
          (AdMob cần dev build, không chạy trong Expo Go).
        </Text>
      ) : null}

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <TouchableOpacity onPress={() => safeBack(router, '/(main)')} style={styles.back}>
        <Text style={styles.backText}>‹ Quay lại</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 14 },
  title: { fontSize: 24, fontWeight: '700' },
  proCard: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#F5C542',
    borderRadius: 10,
    padding: 16,
    gap: 8,
  },
  freeCard: {
    backgroundColor: '#F1F3F5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 16,
    gap: 8,
  },
  proBadge: { color: '#B8860B', fontWeight: '700', fontSize: 13 },
  proBadgeMuted: { color: '#666', fontWeight: '700', fontSize: 13 },
  proText: { fontSize: 14, lineHeight: 20 },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  hint: { fontSize: 12, color: '#888', lineHeight: 17 },
  message: { fontSize: 14, color: '#333', lineHeight: 20 },
  back: { marginTop: 12, alignSelf: 'flex-start' },
  backText: { color: '#208AEF', fontSize: 15 },
});
