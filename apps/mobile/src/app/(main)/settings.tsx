import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { formatHoursLeft, getProStatus } from '@/lib/tier';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut, tier, subscriptionExpiresAt } = useAuth();
  const pro = getProStatus(tier, subscriptionExpiresAt);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cài đặt</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <View style={styles.menu}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/(main)/pro')}
        >
          <View style={styles.rowLeft}>
            <Text style={styles.rowText}>Mở Pro (xem quảng cáo)</Text>
            <Text style={styles.rowSub}>
              {pro.isPro
                ? `Đang Pro — còn ${formatHoursLeft(pro.hoursLeft)}`
                : 'Gói Free — xem ad nhận Pro 24h'}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/(main)/constitution-settings')}
        >
          <Text style={styles.rowText}>Hiến pháp giao dịch (luật của tôi)</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/(main)/discipline-explainer')}
        >
          <Text style={styles.rowText}>Discipline vs Edge Score</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={signOut} style={styles.signOut}>
        <Text style={styles.signOutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  email: { fontSize: 14, opacity: 0.6 },
  menu: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rowLeft: { flex: 1, gap: 2 },
  rowText: { fontSize: 15 },
  rowSub: { fontSize: 12, opacity: 0.6 },
  chevron: { fontSize: 18, opacity: 0.4 },
  signOut: { marginTop: 24, alignItems: 'center', padding: 12 },
  signOutText: { color: '#d33', fontSize: 15 },
});
