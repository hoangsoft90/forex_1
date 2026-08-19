import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import i18n from '@/i18n';
import { safeBack } from '@/lib/navigation';
import { syncEveningNotification } from '@/lib/notification-manager';
import { supabase } from '@/lib/supabase';

type ParseResult = {
  imported: number;
  errorLines: { lineNumber: number; content: string; reason: string }[];
  message: string;
};

/**
 * Copy-Paste MT4/MT5 Account History — Module 5.
 *
 * ⚠️ Parser dựa trên FORMAT GIẢ ĐỊNH từ tài liệu công khai MetaQuotes + format phổ biến
 * khi copy-to-clipboard — CHƯA verify với dữ liệu thật từ MT4. Cần test với export thật
 * (MT4 desktop + mobile) trước khi coi module này là Done.
 */
export default function PasteMt4Screen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleParse() {
    if (!text.trim()) {
      setError(t('pasteMt4.emptyError'));
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('parse-mt4', {
        body: { text, lang: i18n.language },
      });
      if (fnError) throw fnError;
      setResult(data as ParseResult);
      // Vừa import lệnh đóng → re-sync evening review nếu hôm nay có lệnh
      if ((data as ParseResult).imported > 0) {
        syncEveningNotification().catch(() => {});
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? t('pasteMt4.edgeError', { message: e.message })
          : t('common.error'),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('pasteMt4.title')}</Text>
      <Text style={styles.subtitle}>{t('pasteMt4.subtitle')}</Text>

      <TextInput
        style={styles.textarea}
        multiline
        value={text}
        onChangeText={setText}
        placeholder={'Order\tTime\tType\tSize\tSymbol\tPrice\tS/L\tT/P\t...\n10001\t2024.01.02 10:15\tbuy\t0.10\tEURUSD\t1.10000\t...'}
        placeholderTextColor="#999"
        textAlignVertical="top"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.parseBtn, loading && styles.disabled]}
        onPress={handleParse}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.parseText}>{t('pasteMt4.parseImport')}</Text>}
      </TouchableOpacity>

      {result && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>{t('pasteMt4.result', { count: result.imported })}</Text>
          {result.message ? <Text style={styles.resultMsg}>{result.message}</Text> : null}
          {result.errorLines.length > 0 && (
            <>
              <Text style={styles.errorTitle}>
                {t('pasteMt4.errorCount', { count: result.errorLines.length })}
              </Text>
              {result.errorLines.map((e, i) => (
                <View key={i} style={styles.errorLine}>
                  <Text style={styles.errorLineNo}>{t('pasteMt4.errorLine', { line: e.lineNumber })}</Text>
                  <Text style={styles.errorLineContent} numberOfLines={2}>{e.content}</Text>
                  <Text style={styles.errorLineReason}>{e.reason}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}

      <TouchableOpacity style={styles.backBtn} onPress={() => safeBack(router, '/(main)')}>
        <Text style={styles.backText}>{t('common.back')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
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
    minHeight: 200,
    fontSize: 13,
    fontFamily: 'monospace',
  },
  error: { color: '#d33', fontSize: 13, marginTop: 8 },
  parseBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  disabled: { opacity: 0.6 },
  parseText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resultBox: { marginTop: 16, gap: 6 },
  resultTitle: { fontSize: 16, fontWeight: '700', color: '#28a745' },
  resultMsg: { fontSize: 13, opacity: 0.8 },
  errorTitle: { fontSize: 14, fontWeight: '700', color: '#d33', marginTop: 8 },
  errorLine: {
    borderWidth: 1,
    borderColor: '#f0c0c0',
    backgroundColor: '#fdf0f0',
    borderRadius: 8,
    padding: 8,
    gap: 2,
  },
  errorLineNo: { fontSize: 12, fontWeight: '700', color: '#d33' },
  errorLineContent: { fontSize: 12, fontFamily: 'monospace', opacity: 0.8 },
  errorLineReason: { fontSize: 12, color: '#a94442' },
  backBtn: { marginTop: 16, alignItems: 'center', padding: 10 },
  backText: { color: '#208AEF', fontSize: 15, fontWeight: '600' },
});
