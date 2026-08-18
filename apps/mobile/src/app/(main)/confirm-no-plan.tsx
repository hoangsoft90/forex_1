import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { safeBack } from '@/lib/navigation';

/**
 * Route thoát: "Tạo lệnh không có Plan" (mvp_scope mục 3).
 * Bắt buộc qua màn hình xác nhận phụ trước khi cho phép tạo execution
 * với trade_plan_id = null. Đây là lựa chọn RIÊNG BIỆT, có cảnh báo.
 *
 * ⚠️ KHÔNG insert execution placeholder (lot 0 / entry 0) — sẽ tạo "lệnh ma"
 * trong Journal + vị thế mở vĩnh viễn trong Portfolio Risk. Sau khi user
 * xác nhận, điều hướng sang Execution Widget để nhập lệnh THẬT (không plan).
 */
export default function ConfirmNoPlanScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  function handleConfirm() {
    // Nhập lệnh thật qua widget — widget cho phép lưu trade_plan_id = null.
    router.replace('/(main)/execution-widget');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('confirmNoPlan.title')}</Text>
      <View style={styles.warnBox}>
        <Text style={styles.warnTitle}>{t('confirmNoPlan.warnTitle')}</Text>
        <Text style={styles.warnText}>{t('confirmNoPlan.warn1')}</Text>
        <Text style={styles.warnText}>{t('confirmNoPlan.warn2')}</Text>
      </View>

      <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
        <Text style={styles.confirmText}>{t('confirmNoPlan.confirm')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={() => safeBack(router, '/(main)/new-plan')}>
        <Text style={styles.cancelText}>{t('confirmNoPlan.cancel')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 16 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', lineHeight: 28 },
  warnBox: {
    backgroundColor: '#FCF8E3',
    borderWidth: 1,
    borderColor: '#E0C46B',
    borderRadius: 10,
    padding: 16,
    gap: 8,
  },
  warnTitle: { fontSize: 15, fontWeight: '700', color: '#8a6d3b' },
  warnText: { fontSize: 14, lineHeight: 21, color: '#6d5a1f' },
  confirmBtn: {
    backgroundColor: '#d9534f',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', padding: 10 },
  cancelText: { color: '#208AEF', fontSize: 15, fontWeight: '600' },
});
