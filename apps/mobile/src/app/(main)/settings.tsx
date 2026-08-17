import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { formatHoursLeft, getProStatus } from '@/lib/tier';
import { NotificationPrefs, scheduleDailyNotifications } from '@/lib/notification-manager';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut, tier, subscriptionExpiresAt } = useAuth();
  const pro = getProStatus(tier, subscriptionExpiresAt);

  const [prefs, setPrefs] = useState<NotificationPrefs>({
    morning_enabled: true,
    morning_time: '08:00',
    evening_enabled: true,
    evening_time: '21:00',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!user) return;
      setLoading(true);
      const { data } = await supabase
        .from('notification_preferences')
        .select('morning_brief_enabled, morning_brief_time, evening_review_enabled, evening_review_time')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setPrefs({
          morning_enabled: data.morning_brief_enabled !== false,
          morning_time: (data.morning_brief_time ?? '08:00').slice(0, 5),
          evening_enabled: data.evening_review_enabled !== false,
          evening_time: (data.evening_review_time ?? '21:00').slice(0, 5),
        });
      }
      setLoading(false);
    })();
  }, [user]);

  function isTimeValid(t: string): boolean {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
  }

  async function handleSave() {
    if (!user) return;
    if (!isTimeValid(prefs.morning_time) || !isTimeValid(prefs.evening_time)) {
      setError('Giờ phải đúng định dạng HH:MM (24h), ví dụ 08:00 hoặc 21:30.');
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const { error: e } = await supabase.from('notification_preferences').upsert({
        user_id: user.id,
        morning_brief_enabled: prefs.morning_enabled,
        morning_brief_time: `${prefs.morning_time}:00`,
        evening_review_enabled: prefs.evening_enabled,
        evening_review_time: `${prefs.evening_time}:00`,
        updated_at: new Date().toISOString(),
      });
      if (e) throw e;

      // Lên lịch lại theo cấu hình mới (kiểm tra lệnh đóng hôm nay cho evening)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { data: closedToday } = await supabase
        .from('trade_executions')
        .select('id')
        .eq('user_id', user.id)
        .gte('exit_time', startOfDay.toISOString());
      await scheduleDailyNotifications(prefs, (closedToday ?? []).length > 0);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Có lỗi khi lưu cài đặt notification.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Cài đặt</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <View style={styles.menu}>
        <TouchableOpacity style={styles.row} onPress={() => router.push('/(main)/pro')}>
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

        <TouchableOpacity style={styles.row} onPress={() => router.push('/(main)/constitution-settings')}>
          <Text style={styles.rowText}>Hiến pháp giao dịch (luật của tôi)</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={() => router.push('/(main)/discipline-explainer')}>
          <Text style={styles.rowText}>Discipline vs Edge Score</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* ---- Module 8: Notification settings — bật/tắt TỪNG loại riêng biệt ---- */}
      <Text style={styles.sectionTitle}>Thông báo</Text>
      <View style={styles.menu}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowText}>Brief buổi sáng</Text>
            <Text style={styles.rowSub}>Discipline Score hôm qua + rules hôm nay (mặc định 08:00)</Text>
          </View>
          <Switch
            value={prefs.morning_enabled}
            onValueChange={(v) => setPrefs((p) => ({ ...p, morning_enabled: v }))}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowText}>Giờ brief sáng</Text>
          <TextInput
            style={styles.timeInput}
            value={prefs.morning_time}
            onChangeText={(t) => setPrefs((p) => ({ ...p, morning_time: t }))}
            placeholder="08:00"
            placeholderTextColor="#999"
            maxLength={5}
          />
        </View>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowText}>Review cuối ngày</Text>
            <Text style={styles.rowSub}>Nhắc review khi có lệnh đóng trong ngày (mặc định 21:00)</Text>
          </View>
          <Switch
            value={prefs.evening_enabled}
            onValueChange={(v) => setPrefs((p) => ({ ...p, evening_enabled: v }))}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowText}>Giờ review tối</Text>
          <TextInput
            style={styles.timeInput}
            value={prefs.evening_time}
            onChangeText={(t) => setPrefs((p) => ({ ...p, evening_time: t }))}
            placeholder="21:00"
            placeholderTextColor="#999"
            maxLength={5}
          />
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {saved ? <Text style={styles.saved}>✓ Đã lưu — notification sẽ áp dụng theo giờ bạn chọn.</Text> : null}

      <TouchableOpacity
        style={[styles.saveBtn, (saving || loading) && styles.disabled]}
        onPress={handleSave}
        disabled={saving || loading}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Lưu cài đặt thông báo</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={signOut} style={styles.signOut}>
        <Text style={styles.signOutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: '700' },
  email: { fontSize: 14, opacity: 0.6 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 18, marginBottom: 6 },
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
    gap: 8,
  },
  rowLeft: { flex: 1, gap: 2 },
  rowText: { fontSize: 15 },
  rowSub: { fontSize: 12, opacity: 0.6, lineHeight: 16 },
  chevron: { fontSize: 18, opacity: 0.4 },
  timeInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    minWidth: 64,
    textAlign: 'center',
  },
  error: { color: '#d33', fontSize: 13, marginTop: 10 },
  saved: { color: '#28a745', fontSize: 13, marginTop: 10 },
  saveBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  disabled: { opacity: 0.5 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  signOut: { marginTop: 24, alignItems: 'center', padding: 12 },
  signOutText: { color: '#d33', fontSize: 15 },
});
