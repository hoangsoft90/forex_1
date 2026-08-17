import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { supabase } from '@/lib/supabase';
import {
  canAddRule,
  hasRequiredRules,
  RULE_TEMPLATES,
  RuleTemplate,
  TradingRuleType,
} from '@/lib/trading-rules';

type ActiveRule = {
  id: string;
  rule_type: TradingRuleType;
  base_value: number;
  is_active: boolean;
};

type DraftValue = Record<string, string>; // rule_type -> giá trị đang nhập (text)

export default function ConstitutionScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [rules, setRules] = useState<ActiveRule[]>([]);
  const [drafts, setDrafts] = useState<DraftValue>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error: e } = await supabase
      .from('trading_rules')
      .select('id, rule_type, base_value, is_active')
      .eq('user_id', user.id)
      .order('created_at');
    if (e) {
      setError(e.message);
    } else {
      setRules((data ?? []) as ActiveRule[]);
      const initial: DraftValue = {};
      for (const r of data ?? []) {
        initial[r.rule_type] = String(r.base_value);
      }
      setDrafts(initial);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // Fetch-on-mount: setState xảy ra sau await (async), không phải synchronous trong effect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRules();
  }, [loadRules]);

  const activeCount = rules.filter((r) => r.is_active).length;
  const canAdd = canAddRule(activeCount, 'free'); // Phase 1: mặc định free tier

  async function addRule(template: RuleTemplate) {
    if (!user) return;
    setError(null);
    if (!canAddRule(activeCount + 1, 'free')) {
      setError(`Gói Free chỉ cho tối đa ${3} luật. Nâng cấp Pro để thêm không giới hạn.`);
      return;
    }
    const { data, error: e } = await supabase
      .from('trading_rules')
      .insert({
        user_id: user.id,
        rule_type: template.rule_type,
        base_value: template.default_value,
        unit: template.unit,
        is_active: true,
      })
      .select('id, rule_type, base_value, is_active')
      .single();
    if (e) {
      setError(e.message);
      return;
    }
    setRules((prev) => [...prev, data as ActiveRule]);
    setDrafts((prev) => ({
      ...prev,
      [template.rule_type]: String(template.default_value),
    }));
  }

  async function saveValue(ruleType: TradingRuleType, valueText: string) {
    if (!user) return;
    const value = parseFloat(valueText);
    if (Number.isNaN(value) || value <= 0) return; // chưa hợp lệ thì không lưu
    const { error: e } = await supabase
      .from('trading_rules')
      .update({ base_value: value, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('rule_type', ruleType);
    if (e) setError(e.message);
  }

  async function handleContinue() {
    if (!hasRequiredRules(rules.filter((r) => r.is_active).map((r) => r.rule_type))) {
      setError('Bạn cần có 2 luật bắt buộc: Rủi ro tối đa 1 lệnh và Lỗ tối đa trong ngày.');
      return;
    }
    setSaving(true);
    setError(null);
    // Lưu tất cả draft còn chưa được lưu (onBlur có thể đã lưu từng cái).
    for (const [ruleType, val] of Object.entries(drafts)) {
      const num = parseFloat(val);
      if (!Number.isNaN(num) && num > 0) {
        await saveValue(ruleType as TradingRuleType, val);
      }
    }
    await refreshProfile();
    setSaving(false);
    router.replace('/(main)');
  }

  const ready = hasRequiredRules(rules.filter((r) => r.is_active).map((r) => r.rule_type));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Hiến pháp giao dịch của bạn</Text>
      <Text style={styles.subtitle}>
        Đây là những luật CỦA BẠN — app chỉ giúp bạn giữ lời hứa với chính mình, không áp đặt.
      </Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <>
          <Text style={styles.sectionTitle}>Luật bắt buộc</Text>
          {RULE_TEMPLATES.filter((t) => t.required).map((t) => {
            const existing = rules.find((r) => r.rule_type === t.rule_type);
            return (
              <View key={t.rule_type} style={styles.ruleCard}>
                <View style={styles.ruleHeader}>
                  <Text style={styles.ruleLabel}>{t.label}</Text>
                  {existing ? (
                    <Text style={styles.badge}>✓ Đã thêm</Text>
                  ) : (
                    <TouchableOpacity style={styles.addBtn} onPress={() => addRule(t)}>
                      <Text style={styles.addBtnText}>+ Thêm</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.ruleDesc}>{t.description}</Text>
                {existing && (
                  <TextInput
                    style={styles.valueInput}
                    keyboardType="decimal-pad"
                    value={drafts[t.rule_type] ?? ''}
                    onChangeText={(v) =>
                      setDrafts((prev) => ({ ...prev, [t.rule_type]: v }))
                    }
                    onEndEditing={() => saveValue(t.rule_type, drafts[t.rule_type] ?? '')}
                  />
                )}
              </View>
            );
          })}

          <Text style={styles.sectionTitle}>Luật tùy chọn (Free tối đa 3 luật)</Text>
          {RULE_TEMPLATES.filter((t) => !t.required).map((t) => {
            const existing = rules.find((r) => r.rule_type === t.rule_type);
            return (
              <View key={t.rule_type} style={styles.ruleCard}>
                <View style={styles.ruleHeader}>
                  <Text style={styles.ruleLabel}>{t.label}</Text>
                  {existing ? (
                    <Text style={styles.badge}>✓ Đã thêm</Text>
                  ) : (
                    <TouchableOpacity
                      style={[styles.addBtn, !canAdd && styles.addBtnDisabled]}
                      onPress={() => addRule(t)}
                      disabled={!canAdd}
                    >
                      <Text style={styles.addBtnText}>+ Thêm</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.ruleDesc}>{t.description}</Text>
                {existing && (
                  <TextInput
                    style={styles.valueInput}
                    keyboardType="decimal-pad"
                    value={drafts[t.rule_type] ?? ''}
                    onChangeText={(v) =>
                      setDrafts((prev) => ({ ...prev, [t.rule_type]: v }))
                    }
                    onEndEditing={() => saveValue(t.rule_type, drafts[t.rule_type] ?? '')}
                  />
                )}
              </View>
            );
          })}

          {activeCount >= 3 && (
            <Text style={styles.tierNote}>
              Bạn đang ở gói Free (tối đa 3 luật). Nâng cấp Pro để thêm không giới hạn.
            </Text>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.continueBtn, (!ready || saving) && styles.btnDisabled]}
            onPress={handleContinue}
            disabled={!ready || saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.continueText}>
                {ready ? 'Hoàn tất' : 'Cần thêm 2 luật bắt buộc'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.replace('/(onboarding)/explain')}
          >
            <Text style={styles.backText}>‹ Quay lại bước giải thích</Text>
          </TouchableOpacity>
        </>
      )}
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
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 20,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 12, marginBottom: 8 },
  ruleCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ruleLabel: { fontSize: 15, fontWeight: '600', flex: 1 },
  badge: { color: '#28a745', fontSize: 13, fontWeight: '600' },
  ruleDesc: { fontSize: 13, opacity: 0.7, lineHeight: 18 },
  valueInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginTop: 4,
  },
  addBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  tierNote: {
    fontSize: 12,
    color: '#8a6d3b',
    backgroundColor: '#fcf8e3',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  error: { color: '#d33', fontSize: 13, marginTop: 8, textAlign: 'center' },
  continueBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  btnDisabled: { opacity: 0.5 },
  continueText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backBtn: { alignItems: 'center', padding: 12 },
  backText: { color: '#208AEF', fontSize: 14, fontWeight: '600' },
});
