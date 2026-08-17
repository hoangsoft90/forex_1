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
import { safeBack } from '@/lib/navigation';
import { supabase } from '@/lib/supabase';

/**
 * Route thoát: "Tạo lệnh không có Plan" (mvp_scope mục 3).
 * Bắt buộc qua màn hình xác nhận phụ trước khi cho phép tạo execution
 * với trade_plan_id = null. Đây là lựa chọn RIÊNG BIỆT, có cảnh báo.
 */
export default function ConfirmNoPlanScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!user) return;
    setCreating(true);
    setError(null);
    try {
      // Execution tối thiểu với trade_plan_id = null (out-of-plan trade).
      // Module 5 (Execution Capture) sẽ có widget nhập đầy đủ — đây là lối tắt cảnh báo.
      const { error: e } = await supabase.from('trade_executions').insert({
        user_id: user.id,
        symbol: 'EURUSD',
        direction: 'buy',
        lot_size: 0,
        actual_entry: 0,
        entry_time: new Date().toISOString(),
        source: 'manual',
        trade_plan_id: null,
      });
      if (e) throw e;
      safeBack(router, '/(main)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Có lỗi khi tạo lệnh.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bạn đang tạo lệnh KHÔNG có kế hoạch</Text>
      <View style={styles.warnBox}>
        <Text style={styles.warnTitle}>⚠ Cảnh báo</Text>
        <Text style={styles.warnText}>
          Lệnh ngoài kế hoạch không có Plan để đối chiếu — bạn sẽ không biết mình có đi
          chệch kế hoạch hay không, và không có lý do rõ ràng để học từ lệnh này.
        </Text>
        <Text style={styles.warnText}>
          Nếu bạn đang giao dịch cảm tính, hãy quay lại tạo Plan trước — mất chưa đầy 1 phút.
        </Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.confirmBtn, creating && styles.disabled]}
        onPress={handleConfirm}
        disabled={creating}
      >
        {creating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.confirmText}>Tôi hiểu, vẫn tạo lệnh không có Plan</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelBtn}
        onPress={() => safeBack(router, '/(main)/new-plan')}
      >
        <Text style={styles.cancelText}>Quay lại tạo Plan</Text>
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
  error: { color: '#d33', fontSize: 13, textAlign: 'center' },
  confirmBtn: {
    backgroundColor: '#d9534f',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  disabled: { opacity: 0.6 },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', padding: 10 },
  cancelText: { color: '#208AEF', fontSize: 15, fontWeight: '600' },
});
