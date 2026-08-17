import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ONBOARDING_EVENTS, trackEvent } from '@/lib/analytics';

export default function ExplainScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleUnderstood() {
    setLoading(true);
    // Ghi mốc hoàn tất onboarding → dùng để đo AC "≤ 3 phút".
    await trackEvent(ONBOARDING_EVENTS.COMPLETED);
    router.replace('/(onboarding)/constitution');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>2 loại điểm, 2 ý nghĩa khác nhau</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Discipline Score</Text>
        <Text style={styles.cardBody}>
          Đo mức độ TUÂN THỦ kế hoạch của chính bạn: vào lệnh đúng plan, không dời
          SL, không revenge trade...
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Edge Score</Text>
        <Text style={styles.cardBody}>
          Đo hiệu quả của CHIẾN LƯỢC bạn đang dùng: winrate, tỷ lệ risk:reward,
          tổng PnL.
        </Text>
      </View>

      <View style={styles.note}>
        <Text style={styles.noteText}>
          Điểm kỷ luật cao không đảm bảo lời — nó đảm bảo bạn xác định được đúng
          nguyên nhân thua lỗ: do chiến lược hay do hành vi. Bạn có thể xem lại lời
          giải thích này trong Settings.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleUnderstood}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Đã hiểu</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.replace('/(onboarding)/quiz')}
      >
        <Text style={styles.backText}>‹ Quay lại trả lời quiz</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  card: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 16,
    gap: 6,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#208AEF' },
  cardBody: { fontSize: 14, lineHeight: 20, opacity: 0.85 },
  note: {
    backgroundColor: '#F0F4F8',
    borderRadius: 10,
    padding: 14,
    marginTop: 4,
  },
  noteText: { fontSize: 13, lineHeight: 19, opacity: 0.8 },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backBtn: { alignItems: 'center', padding: 10 },
  backText: { color: '#208AEF', fontSize: 14, fontWeight: '600' },
});
