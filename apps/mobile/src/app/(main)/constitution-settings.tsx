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
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/lib/auth-context';
import { safeBack } from '@/lib/navigation';
import { parseDecimalInput } from '@/lib/parse-number';
import { supabase } from '@/lib/supabase';
import {
  canAddRule,
  RULE_TEMPLATES,
  RuleTemplate,
  TradingRuleType,
} from '@/lib/trading-rules';

type ActiveRule = {
  id: string;
  rule_type: TradingRuleType;
  base_value: number;
  is_active: boolean;
  updated_at: string | null;
};

/** Adaptive condition đang gắn cho rule max_risk_per_trade (nếu có). */
type AdaptiveDraft = {
  id: string | null;
  threshold: string; // ATR gấp X lần trung bình
  adjustedValue: string; // risk % sau điều chỉnh (phải <= base)
};

export default function ConstitutionSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [rules, setRules] = useState<ActiveRule[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState('free');
  const [adaptive, setAdaptive] = useState<AdaptiveDraft | null>(null);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .maybeSingle();
    setTier(profile?.subscription_tier ?? 'free');

    const { data, error: e } = await supabase
      .from('trading_rules')
      .select('id, rule_type, base_value, is_active, updated_at')
      .eq('user_id', user.id)
      .order('created_at');
    if (e) {
      setError(e.message);
    } else {
      setRules((data ?? []) as ActiveRule[]);
      const initial: Record<string, string> = {};
      for (const r of data ?? []) initial[r.rule_type] = String(r.base_value);
      setDrafts(initial);
      // Load adaptive condition của rule max_risk_per_trade (nếu có)
      const riskRule = (data ?? []).find((r) => r.rule_type === 'max_risk_per_trade');
      if (riskRule) {
        const { data: ac } = await supabase
          .from('rule_adaptive_conditions')
          .select('id, condition_value, adjusted_value')
          .eq('rule_id', riskRule.id)
          .maybeSingle();
        if (ac) {
          setAdaptive({
            id: ac.id as string,
            threshold: String(ac.condition_value ?? '1.5'),
            adjustedValue: String(ac.adjusted_value),
          });
        } else {
          setAdaptive(null);
        }
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // Fetch-on-mount: setState xảy ra sau await (async), không phải synchronous trong effect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, [loadAll]);

  const activeCount = rules.filter((r) => r.is_active).length;

  async function saveValue(ruleType: TradingRuleType, valueText: string) {
    if (!user) return;
    const value = parseDecimalInput(valueText);
    if (value == null || value <= 0) return;
    const { error: e } = await supabase
      .from('trading_rules')
      .update({ base_value: value, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('rule_type', ruleType);
    if (e) setError(e.message);
    else await refreshProfile();
  }

  async function addRule(template: RuleTemplate) {
    if (!user) return;
    setError(null);
    // ⚠️ KHÔNG dùng activeCount + 1 — canAddRule(n) = n < 3; cộng 1 sẽ chặn
    // luôn lần thứ 3 (Free: 2 bắt buộc + 1 tùy chọn, tổng 3 là hợp lệ).
    if (!canAddRule(activeCount, tier)) {
      setError(t('constitutionSettings.maxRules', { tier: tier === 'pro' ? 'Pro' : 'Free' }));
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
      .select('id, rule_type, base_value, is_active, updated_at')
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
    await refreshProfile();
  }

  /** Lưu/khóa adaptive condition cho rule max_risk_per_trade (chỉ GIẢM risk). */
  async function saveAdaptive() {
    if (!user || !adaptive) return;
    const rule = rules.find((r) => r.rule_type === 'max_risk_per_trade');
    if (!rule) return;
    const threshold = parseDecimalInput(adaptive.threshold);
    const adjusted = parseDecimalInput(adaptive.adjustedValue);
    if (threshold == null || threshold <= 0 || adjusted == null || adjusted <= 0) {
      setError(t('constitutionSettings.adaptiveInvalid'));
      return;
    }
    if (adjusted > rule.base_value) {
      setError(
        t('constitutionSettings.adaptiveOnlyDecrease', {
          adjusted,
          base: rule.base_value,
        }),
      );
      return;
    }
    setError(null);
    const payload = {
      rule_id: rule.id,
      condition_type: 'atr_threshold',
      condition_operator: 'gt',
      condition_value: threshold,
      adjusted_value: adjusted,
      direction: 'decrease',
    };
    const { data, error: e } = adaptive?.id
      ? await supabase.from('rule_adaptive_conditions').update(payload).eq('id', adaptive.id).select('id, condition_value, adjusted_value').single()
      : await supabase.from('rule_adaptive_conditions').insert(payload).select('id, condition_value, adjusted_value').single();
    if (e) {
      setError(e.message);
      return;
    }
    setAdaptive({ id: data.id as string, threshold: String(data.condition_value), adjustedValue: String(data.adjusted_value) });
  }

  async function deleteAdaptive() {
    if (!user || !adaptive?.id) return;
    setError(null);
    const { error: e } = await supabase
      .from('rule_adaptive_conditions')
      .delete()
      .eq('id', adaptive.id);
    if (e) setError(e.message);
    else setAdaptive(null);
  }

  async function deleteRule(id: string) {
    if (!user) return;
    setError(null);
    const { error: e } = await supabase
      .from('trading_rules')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (e) {
      setError(e.message);
      return;
    }
    setRules((prev) => prev.filter((r) => r.id !== id));
    await refreshProfile();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('constitutionSettings.title')}</Text>
        <Text style={styles.subtitle}>{t('constitutionSettings.subtitle')}</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <>
          {rules.length === 0 && (
            <Text style={styles.empty}>{t('constitutionSettings.empty')}</Text>
          )}

          {rules.map((r) => (
            <View key={r.id} style={styles.ruleCard}>
              <View style={styles.ruleHeader}>
                <Text style={styles.ruleLabel}>{r.rule_type}</Text>
                {!['max_risk_per_trade', 'max_daily_loss'].includes(r.rule_type) && (
                  <TouchableOpacity onPress={() => deleteRule(r.id)}>
                    <Text style={styles.deleteBtn}>{t('constitutionSettings.delete')}</Text>
                  </TouchableOpacity>
                )}
              </View>
              {r.updated_at && (
                <Text style={styles.updatedAt}>
                  {t('constitutionSettings.updatedAt', {
                    time: new Date(r.updated_at).toLocaleString(),
                  })}
                </Text>
              )}
              <TextInput
                style={styles.valueInput}
                keyboardType="decimal-pad"
                value={drafts[r.rule_type] ?? ''}
                onChangeText={(v) => setDrafts((prev) => ({ ...prev, [r.rule_type]: v }))}
                onEndEditing={() => saveValue(r.rule_type, drafts[r.rule_type] ?? '')}
              />

              {/* Phase 2: Adaptive theo ATR — chỉ cho rule max_risk_per_trade */}
              {r.rule_type === 'max_risk_per_trade' && (
                <View style={styles.adaptiveBox}>
                  <Text style={styles.adaptiveTitle}>
                    {t('constitutionSettings.adaptiveTitle')}{' '}
                    {adaptive ? `(${t('constitutionSettings.on')})` : `(${t('constitutionSettings.off')})`}
                  </Text>
                  <Text style={styles.adaptiveHint}>{t('constitutionSettings.adaptiveHint')}</Text>
                  <View style={styles.row}>
                    <View style={styles.half}>
                      <Text style={styles.adaptiveLabel}>{t('constitutionSettings.atrMultiple')}</Text>
                      <TextInput
                        style={styles.valueInput}
                        keyboardType="decimal-pad"
                        value={adaptive?.threshold ?? '1.5'}
                        onChangeText={(v) => setAdaptive((p) => ({ ...(p ?? { id: null, adjustedValue: String(r.base_value) }), threshold: v }))}
                        placeholder="1.5"
                        placeholderTextColor="#888"
                      />
                    </View>
                    <View style={styles.half}>
                      <Text style={styles.adaptiveLabel}>{t('constitutionSettings.adjustedRisk')}</Text>
                      <TextInput
                        style={styles.valueInput}
                        keyboardType="decimal-pad"
                        value={adaptive?.adjustedValue ?? String(r.base_value)}
                        onChangeText={(v) => setAdaptive((p) => ({ ...(p ?? { id: null, threshold: '1.5' }), adjustedValue: v }))}
                        placeholder={String(r.base_value)}
                        placeholderTextColor="#888"
                      />
                    </View>
                  </View>
                  <View style={styles.adaptiveActions}>
                    <TouchableOpacity style={styles.adaptiveSave} onPress={saveAdaptive}>
                      <Text style={styles.adaptiveSaveText}>{t('constitutionSettings.saveAdaptive')}</Text>
                    </TouchableOpacity>
                    {adaptive?.id ? (
                      <TouchableOpacity onPress={deleteAdaptive}>
                        <Text style={styles.adaptiveDelete}>{t('constitutionSettings.removeAdaptive')}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              )}
            </View>
          ))}

          <Text style={styles.sectionTitle}>
            {t('constitutionSettings.addRule', { count: activeCount })}
          </Text>
          {RULE_TEMPLATES.filter((tpl) => !rules.some((r) => r.rule_type === tpl.rule_type)).map(
            (tpl) => (
              <TouchableOpacity key={tpl.rule_type} style={styles.addRow} onPress={() => addRule(tpl)}>
                <Text style={styles.addLabel}>{t(tpl.label)}</Text>
                <Text style={styles.addPlus}>+</Text>
              </TouchableOpacity>
            ),
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.backBtn} onPress={() => safeBack(router, '/(main)')}>
            <Text style={styles.backText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  subtitle: {
    fontSize: 13,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  empty: { textAlign: 'center', opacity: 0.6, marginVertical: 12 },
  ruleCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  ruleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ruleLabel: { fontSize: 15, fontWeight: '600', flex: 1 },
  updatedAt: { fontSize: 11, opacity: 0.5 },
  valueInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  deleteBtn: { color: '#d33', fontSize: 13, fontWeight: '600' },
  adaptiveBox: {
    backgroundColor: '#F9F5EC',
    borderRadius: 8,
    padding: 12,
    gap: 6,
    marginTop: 4,
  },
  adaptiveTitle: { fontSize: 13, fontWeight: '700' },
  adaptiveHint: { fontSize: 11, opacity: 0.7, lineHeight: 16 },
  adaptiveLabel: { fontSize: 11, opacity: 0.6, marginBottom: 2 },
  row: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
  adaptiveActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  adaptiveSave: {
    backgroundColor: '#8a6d3b',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  adaptiveSaveText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  adaptiveDelete: { color: '#d33', fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginTop: 12, marginBottom: 8 },
  addRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#208AEF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  addLabel: { fontSize: 14, color: '#208AEF', fontWeight: '500' },
  addPlus: { fontSize: 18, color: '#208AEF' },
  error: { color: '#d33', fontSize: 13, marginTop: 8, textAlign: 'center' },
  backBtn: { marginTop: 16, alignItems: 'center', padding: 12 },
  backText: { color: '#208AEF', fontSize: 15, fontWeight: '600' },
});
