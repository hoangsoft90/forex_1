import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { formatHoursLeft, getProStatus } from '@/lib/tier';

export default function MainScreen() {
  const router = useRouter();
  const { user, signOut, onboarding, tier, subscriptionExpiresAt } = useAuth();
  const pro = getProStatus(tier, subscriptionExpiresAt);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trading Discipline OS</Text>
      <Text style={styles.subtitle}>
        Chào {user?.email ?? 'trader'}! Bạn đã hoàn tất onboarding.
      </Text>

      <View style={styles.badgeRow}>
        <Text style={styles.badge}>
          {onboarding?.hasBalance ? '✓ Số dư' : '✗ Số dư'}
        </Text>
        <Text style={styles.badge}>
          {onboarding?.hasWeaknessProfile ? '✓ Hồ sơ điểm yếu' : '✗ Hồ sơ điểm yếu'}
        </Text>
      </View>

      <Text style={styles.hint}>
        Module 2 (Personal Trading Constitution) sẽ được build ở bước tiếp theo.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/(main)/execution-widget')}
      >
        <Text style={styles.buttonText}>Nhập lệnh nhanh (Widget)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.buttonSecondary]}
        onPress={() => router.push('/(main)/new-plan')}
      >
        <Text style={styles.buttonText}>Tạo Trade Plan mới</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.buttonSecondary]}
        onPress={() => router.push('/(main)/paste-mt4')}
      >
        <Text style={styles.buttonText}>Paste MT4/MT5 History</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.buttonSecondary]}
        onPress={() => router.push('/(main)/journal')}
      >
        <Text style={styles.buttonText}>Journal & Insight</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.buttonSecondary]}
        onPress={() => router.push('/(main)/scores')}
      >
        <Text style={styles.buttonText}>Discipline & Edge Score</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.buttonSecondary]}
        onPress={() => router.push('/(main)/weekly-audit')}
      >
        <Text style={styles.buttonText}>Weekly Audit</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.buttonSecondary]}
        onPress={() => router.push('/(main)/portfolio-risk')}
      >
        <Text style={styles.buttonText}>Rủi ro danh mục {pro.isPro ? '(Pro)' : ''}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, pro.isPro ? styles.buttonSecondary : styles.buttonPro]}
        onPress={() => router.push('/(main)/pro')}
      >
        <Text style={styles.buttonText}>
          {pro.isPro
            ? `Pro đang hoạt động (còn ${formatHoursLeft(pro.hoursLeft)})`
            : 'Mở Pro — xem quảng cáo 24h'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.buttonSecondary]}
        onPress={() => router.push('/(main)/settings')}
      >
        <Text style={styles.buttonText}>Mở Cài đặt</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={signOut} style={styles.signOut}>
        <Text style={styles.signOutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14, opacity: 0.7, textAlign: 'center' },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  badge: {
    backgroundColor: '#EAF3FF',
    color: '#208AEF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  hint: { fontSize: 13, opacity: 0.6, textAlign: 'center', marginTop: 8 },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'stretch',
  },
  buttonSecondary: { backgroundColor: '#6c757d' },
  buttonPro: { backgroundColor: '#B8860B' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  signOut: { marginTop: 8 },
  signOutText: { color: '#d33', fontSize: 14 },
});
