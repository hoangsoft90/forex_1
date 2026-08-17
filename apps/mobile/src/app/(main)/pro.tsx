import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  formatCooldown,
  getLastRewardedAt,
  getRemainingCooldownMs,
} from '@/lib/ad-cooldown';
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
  // Cooldown: số ms còn phải chờ trước khi xem ad tiếp theo (0 = sẵn sàng).
  const [cooldownMs, setCooldownMs] = useState(0);

  // Load cooldown lúc mở màn hình + đồng hồ đếm ngược mỗi giây.
  useEffect(() => {
    let mounted = true;
    getLastRewardedAt().then((last) => {
      if (mounted) setCooldownMs(getRemainingCooldownMs(last));
    });
    const timer = setInterval(() => {
      getLastRewardedAt().then((last) => {
        if (mounted) setCooldownMs(getRemainingCooldownMs(last));
      });
    }, 1000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const status = getProStatus(tier, subscriptionExpiresAt);
  const admobReady = isAdmobConfigured();
  const cooldownActive = cooldownMs > 0;

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
    // Cập nhật lại cooldown ngay sau khi xem (thành công hoặc bị chặn).
    const last = await getLastRewardedAt();
    setCooldownMs(getRemainingCooldownMs(last));
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
        style={[styles.button, (loading || !admobReady || cooldownActive) && styles.buttonDisabled]}
        onPress={handleWatchAd}
        disabled={loading || !admobReady || cooldownActive}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : cooldownActive ? (
          <Text style={styles.buttonText}>
            ⏳ Thử lại sau {formatCooldown(cooldownMs)}
          </Text>
        ) : (
          <Text style={styles.buttonText}>
            {admobReady ? '▶ Xem quảng cáo — mở Pro 24h' : 'Quảng cáo chưa được cấu hình'}
          </Text>
        )}
      </TouchableOpacity>

      {cooldownActive ? (
        <Text style={styles.hint}>
          Bạn vừa xem quảng cáo. Xem lần tiếp theo sau {formatCooldown(cooldownMs)} để chống spam.
        </Text>
      ) : null}

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
