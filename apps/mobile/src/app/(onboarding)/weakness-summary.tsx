import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { listWeaknesses } from '@/lib/instant-audit';
import { supabase } from '@/lib/supabase';

/**
 * Onboarding Instant Audit — FALLBACK 3.3 (Module 3).
 *
 * Khi INSTANT_AUDIT_ENABLED = false (mặc định — gate cứng Module 0 chưa mở):
 * hiển thị "Dự đoán điểm yếu của bạn" từ weakness_profile (quiz), cá nhân hóa,
 * KHÔNG gọi parser. Giữ vĩnh viễn cho đến khi Module 0 đạt ngưỡng thật.
 */
export default function WeaknessSummaryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Record<string, boolean> | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('user_profiles')
      .select('weakness_profile')
      .eq('id', user.id)
      .maybeSingle();
    setProfile(data?.weakness_profile ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const weaknesses = listWeaknesses(profile);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Dự đoán điểm yếu của bạn</Text>
      <Text style={styles.subtitle}>
        Từ những câu trả lời vừa rồi, đây là các điểm yếu bạn tự nhận có thể ảnh hưởng
        đến kết quả giao dịch. Hệ thống sẽ theo dõi và đối chiếu với hành vi thực tế.
      </Text>

      {weaknesses.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✅ Không có điểm yếu nổi bật</Text>
          <Text style={styles.cardBody}>
            Bạn không tự nhận bất kỳ thói quen rủi ro nào trong quiz. Nếu kết quả giao dịch
            không như mong đợi, hãy theo dõi Journal — dữ liệu thật sẽ cho câu trả lời chính xác nhất.
          </Text>
        </View>
      ) : (
        weaknesses.map((w) => (
          <View key={w.key} style={styles.card}>
            <Text style={styles.cardTitle}>⚠️ {w.label}</Text>
            <Text style={styles.cardBody}>{w.description}</Text>
          </View>
        ))
      )}

      <View style={styles.note}>
        <Text style={styles.noteText}>
          Lưu ý: đây là dự đoán dựa trên câu trả lời của bạn — khi có dữ liệu lệnh thực tế,
          hệ thống sẽ đối chiếu để xác định điểm yếu chính xác hơn.
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={() => router.replace('/(onboarding)/explain')}>
        <Text style={styles.buttonText}>Tiếp tục</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(onboarding)/quiz')}>
        <Text style={styles.backText}>‹ Quay lại trả lời quiz</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  subtitle: {
    fontSize: 13,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 19,
  },
  card: {
    borderWidth: 1,
    borderColor: '#F5C542',
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    gap: 4,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#8a6d3b' },
  cardBody: { fontSize: 13, lineHeight: 19, opacity: 0.85 },
  note: {
    backgroundColor: '#F0F4F8',
    borderRadius: 10,
    padding: 14,
    marginTop: 4,
  },
  noteText: { fontSize: 12, lineHeight: 18, opacity: 0.75 },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backBtn: { alignItems: 'center', padding: 10 },
  backText: { color: '#208AEF', fontSize: 14, fontWeight: '600' },
});
