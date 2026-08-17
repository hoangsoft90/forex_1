import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ONBOARDING_EVENTS, trackEvent } from '@/lib/analytics';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export default function BalanceScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [balance, setBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    const value = parseFloat(balance);
    if (!balance || Number.isNaN(value) || value <= 0) {
      setError('Vui lòng nhập số dư tài khoản hợp lệ (lớn hơn 0).');
      return;
    }
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      await trackEvent(ONBOARDING_EVENTS.STARTED, {
        account_currency: 'USD',
      });
      const { error: upsertError } = await supabase.from('user_profiles').upsert({
        id: user.id,
        account_balance_baseline: value,
        account_currency: 'USD',
        updated_at: new Date().toISOString(),
      });
      if (upsertError) throw upsertError;
      await refreshProfile();
      router.replace('/(onboarding)/quiz');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Có lỗi xảy ra khi lưu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Số dư tài khoản giao dịch</Text>
        <Text style={styles.subtitle}>
          App dùng số này làm baseline để tính % rủi ro (lot size, giới hạn lỗ) cho các bước sau.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="VD: 10000"
          placeholderTextColor="#888"
          value={balance}
          onChangeText={setBalance}
          keyboardType="decimal-pad"
        />
        <Text style={styles.currency}>USD</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Tiếp tục</Text>
          )}
        </TouchableOpacity>

        {/* Bước đầu onboarding — không có bước trước để quay lại.
            (Đăng xuất có sẵn trong Settings sau khi hoàn tất.) */}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  card: { gap: 12 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 14, opacity: 0.7, textAlign: 'center', lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 14,
    fontSize: 18,
    marginTop: 8,
  },
  currency: { textAlign: 'center', color: '#888', fontSize: 13 },
  error: { color: '#d33', fontSize: 13 },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
