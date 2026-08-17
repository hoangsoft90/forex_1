import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { computeInstantAudit, formatInstantAudit, isInstantAuditEnabled } from '@/lib/instant-audit';
import { supabase } from '@/lib/supabase';

type ParseResult = {
  imported: number;
  errorLines: { lineNumber: number; content: string; reason: string }[];
  message: string;
};

type AuditExec = {
  id: string;
  direction: 'buy' | 'sell';
  lot_size: number;
  actual_risk_percent: number | null;
  entry_time: string;
  exit_time: string | null;
  pnl_amount: number | null;
};

/**
 * Onboarding Instant Audit — Module 3.2 (chỉ chạy khi INSTANT_AUDIT_ENABLED=true,
 * gate cứng Module 0). Mặc định KHÔNG được điều hướng tới — fallback 3.3 dùng thay.
 *
 * Luồng: dán lịch sử (tùy chọn, có "Bỏ qua") → Edge Function parse-mt4 (đã fix Module 0)
 * → chạy Behavior Engine hiện có trên lệnh vừa import → hiển thị audit.
 * Nếu parse có dòng lỗi: hiện RÕ số dòng lỗi, KHÔNG hiện audit từ dữ liệu thiếu mà không cảnh báo.
 */
export default function InstantAuditScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [auditText, setAuditText] = useState<string | null>(null);

  // An toàn kép: kiểm tra flag từ feature_flags ngay khi mount
  useEffect(() => {
    isInstantAuditEnabled().then(setEnabled);
  }, []);

  async function handleAnalyze() {
    if (!text.trim()) {
      setError('Dán lịch sử giao dịch từ MT4/MT5 (Account History → Copy) trước, hoặc bấm Bỏ qua.');
      return;
    }
    setLoading(true);
    setError(null);
    setAuditText(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('parse-mt4', {
        body: { text },
      });
      if (fnError) throw fnError;
      const result = data as ParseResult;

      // AC: parse có dòng lỗi → hiển thị rõ số dòng lỗi + KHÔNG hiện audit không cảnh báo
      if (result.errorLines.length > 0) {
        setError(
          `⚠ ${result.errorLines.length} dòng không import được (dòng ${result.errorLines
            .slice(0, 5)
            .map((e) => e.lineNumber)
            .join(', ')}...) — kết quả dưới đây dựa trên dữ liệu thiếu. Bạn có thể sửa tay trong Journal sau.`,
        );
      }

      if (!user) return;
      // Lấy lệnh vừa import (của user này) để chạy Behavior Engine
      const { data: execs } = await supabase
        .from('trade_executions')
        .select('id, direction, lot_size, actual_risk_percent, entry_time, exit_time, pnl_amount')
        .eq('user_id', user.id)
        .order('entry_time', { ascending: false })
        .limit(200);
      const list = (execs ?? []) as AuditExec[];
      if (list.length === 0) {
        setError('Chưa có lệnh nào được import — kiểm tra lại định dạng dán.');
        return;
      }
      const audit = computeInstantAudit(list);
      setAuditText(formatInstantAudit(audit));
    } catch (e) {
      setError(
        e instanceof Error
          ? `Lỗi khi gọi Edge Function: ${e.message} — đảm bảo đã deploy function parse-mt4`
          : 'Có lỗi xảy ra.',
      );
    } finally {
      setLoading(false);
    }
  }

  if (enabled === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!enabled) {
    // An toàn kép: nếu vô tình điều hướng tới khi flag tắt → về explain (không gọi parser)
    return (
      <View style={styles.center}>
        <Text style={styles.offText}>Instant Audit chưa được bật.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/(onboarding)/explain')}>
          <Text style={styles.buttonText}>Tiếp tục</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Điểm yếu thực tế của bạn</Text>
      <Text style={styles.subtitle}>
        Dán lịch sử giao dịch gần đây (MT4/MT5 → Account History → Copy) để xem điểm yếu
        từ dữ liệu thật. Không bắt buộc — bấm Bỏ qua nếu chưa có.
      </Text>

      <TextInput
        style={styles.textarea}
        multiline
        value={text}
        onChangeText={setText}
        placeholder={'Order\tTime\tType\tSize\tSymbol\tPrice\t...\n10001\t2024.01.02 10:15\tbuy\t0.10\tEURUSD\t1.10000\t...'}
        placeholderTextColor="#999"
        textAlignVertical="top"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {auditText ? (
        <View style={styles.auditBox}>
          <Text style={styles.auditText}>{auditText}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.button, loading && styles.disabled]}
        onPress={handleAnalyze}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Phân tích</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipBtn} onPress={() => router.replace('/(onboarding)/explain')}>
        <Text style={styles.skipText}>Bỏ qua — tiếp tục</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  subtitle: {
    fontSize: 13,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 19,
  },
  textarea: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    minHeight: 160,
    fontSize: 13,
    fontFamily: 'monospace',
  },
  error: { color: '#d33', fontSize: 13, marginTop: 8, lineHeight: 18 },
  auditBox: {
    backgroundColor: '#F0F6FF',
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
  },
  auditText: { fontSize: 14, lineHeight: 21 },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  skipBtn: { alignItems: 'center', padding: 12, marginTop: 4 },
  skipText: { color: '#8a6d3b', fontSize: 14, fontWeight: '600' },
  offText: { fontSize: 15, opacity: 0.7 },
});
