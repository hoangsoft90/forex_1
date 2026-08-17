import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { isInstantAuditEnabled } from '@/lib/instant-audit';
import { supabase } from '@/lib/supabase';
import {
  buildWeaknessProfile,
  isQuizComplete,
  QUIZ_QUESTIONS,
  QuizAnswerMap,
  QuizOption,
} from '@/lib/weakness-quiz';

export default function QuizScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [answers, setAnswers] = useState<QuizAnswerMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectOption(questionId: string, weight: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: weight }));
  }

  async function handleSubmit() {
    if (!isQuizComplete(answers)) {
      setError('Vui lòng trả lời tất cả câu hỏi trước khi tiếp tục.');
      return;
    }
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const weaknessProfile = buildWeaknessProfile(answers);
      const { error: upsertError } = await supabase.from('user_profiles').upsert({
        id: user.id,
        weakness_profile: weaknessProfile,
        updated_at: new Date().toISOString(),
      });
      if (upsertError) throw upsertError;
      await refreshProfile();
      // Module 3 (Retention): Instant Audit bật (gate đã mở — đọc từ feature_flags) →
      // bước dán lịch sử tùy chọn; ngược lại → fallback 3.3 "Dự đoán điểm yếu" (KHÔNG gọi parser).
      const auditEnabled = await isInstantAuditEnabled();
      router.replace(
        auditEnabled ? '/(onboarding)/instant-audit' : '/(onboarding)/weakness-summary',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Có lỗi xảy ra khi lưu.');
    } finally {
      setLoading(false);
    }
  }

  const complete = isQuizComplete(answers);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Hồ sơ điểm yếu</Text>
      <Text style={styles.subtitle}>
        Trả lời theo thói quen giao dịch thực tế của bạn — không có câu trả lời đúng/sai.
      </Text>

      {QUIZ_QUESTIONS.map((q) => (
        <View key={q.id} style={styles.questionBlock}>
          <Text style={styles.question}>
            {q.question}
          </Text>
          {q.options.map((opt: QuizOption) => {
            const selected = answers[q.id] === opt.weight;
            return (
              <TouchableOpacity
                key={opt.label}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => selectOption(q.id, opt.weight)}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.replace('/(onboarding)/balance')}
      >
        <Text style={styles.backText}>‹ Quay lại nhập số dư</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, (!complete || loading) && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={!complete || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {complete ? 'Xem kết quả' : `Còn ${QUIZ_QUESTIONS.length - Object.keys(answers).length} câu chưa trả lời`}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  questionBlock: { marginBottom: 20 },
  question: { fontSize: 15, fontWeight: '600', marginBottom: 8, lineHeight: 21 },
  option: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
  },
  optionSelected: { borderColor: '#208AEF', backgroundColor: '#EAF3FF' },
  optionText: { fontSize: 14 },
  optionTextSelected: { color: '#208AEF', fontWeight: '600' },
  error: { color: '#d33', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backBtn: { alignItems: 'center', padding: 8, marginBottom: 4 },
  backText: { color: '#208AEF', fontSize: 14, fontWeight: '600' },
});
