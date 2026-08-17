import { StyleSheet, Text, View } from 'react-native';

export default function DisciplineExplainerScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Discipline Score vs Edge Score</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Discipline Score</Text>
        <Text style={styles.cardBody}>
          Đo mức độ tuân thủ kế hoạch của chính bạn — không đo kết quả tài chính.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Edge Score</Text>
        <Text style={styles.cardBody}>
          Đo hiệu quả của chiến lược: winrate, risk:reward, tổng PnL.
        </Text>
      </View>

      <View style={styles.note}>
        <Text style={styles.noteText}>
          Điểm kỷ luật cao không đảm bảo lời — nó đảm bảo bạn xác định đúng nguyên
          nhân thua lỗ: do chiến lược hay do hành vi.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  card: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 16, gap: 6 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#208AEF' },
  cardBody: { fontSize: 14, lineHeight: 20, opacity: 0.85 },
  note: { backgroundColor: '#F0F4F8', borderRadius: 10, padding: 14 },
  noteText: { fontSize: 13, lineHeight: 19, opacity: 0.8 },
});
