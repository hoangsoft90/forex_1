import { StyleSheet, Text, View } from 'react-native';

import {
  COST_DISCLAIMER,
  CostResult,
} from '@/lib/cost-of-indiscipline';

/**
 * Cost of Indiscipline card — Module 4.
 * Dùng chung ở Today Dashboard + Weekly Audit (Free).
 *
 * Bắt buộc:
 *  - Không hiển thị con số khi chưa đủ ngưỡng → thông báo "Cần thêm dữ liệu".
 *  - Disclaimer CỐ ĐỊNH hiển thị ngay dưới con số ở MỌI nơi (không rút gọn).
 */
export default function CostOfIndisciplineCard({
  result,
  isPro = false,
}: {
  result: CostResult | null;
  isPro?: boolean;
}) {
  if (!result) return null;

  if (!result.showable) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Chi phí của sự vô kỷ luật</Text>
        <Text style={styles.hiddenText}>{result.hiddenReason}</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Chi phí của sự vô kỷ luật</Text>
      <Text style={styles.costLine}>
        {result.cost >= 0 ? '−' : '+'}${Math.abs(result.cost).toFixed(2)}
      </Text>
      <Text style={styles.detailLine}>
        {result.deviatedCount} lệnh lệch plan trong {result.totalTrades} lệnh kỳ này
        (giả định theo plan đạt TP: +${result.hypotheticalPnl.toFixed(0)} vs thực tế ${result.actualPnl.toFixed(0)})
      </Text>
      {isPro && result.skippedIncomplete > 0 && (
        <Text style={styles.skipNote}>Bỏ qua {result.skippedIncomplete} lệnh thiếu dữ liệu plan (không suy đoán).</Text>
      )}
      {/* Disclaimer CỐ ĐỊNH — bắt buộc, đúng nguyên văn, ngay dưới con số */}
      <Text style={styles.disclaimer}>{COST_DISCLAIMER}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FDF3F3',
    borderWidth: 1,
    borderColor: '#f0c9c9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 4,
  },
  title: { fontSize: 15, fontWeight: '700' },
  costLine: { fontSize: 28, fontWeight: '800', color: '#d9534f' },
  detailLine: { fontSize: 12, opacity: 0.8, lineHeight: 17 },
  skipNote: { fontSize: 11, opacity: 0.65, fontStyle: 'italic' },
  disclaimer: { fontSize: 11, opacity: 0.7, lineHeight: 16, marginTop: 6, fontStyle: 'italic' },
  hiddenText: { fontSize: 13, opacity: 0.7 },
});
