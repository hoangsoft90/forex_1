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

import { EXECUTION_EVENTS, trackEvent } from '@/lib/analytics';
import { useAuth } from '@/lib/auth-context';
import { syncEveningNotification } from '@/lib/notification-manager';
import { safeBack } from '@/lib/navigation';
import { parseDecimalInput } from '@/lib/parse-number';
import { calculateActualRiskPercent, isSupportedSymbol } from '@/lib/risk-engine';
import { supabase } from '@/lib/supabase';

type LinkedPlan = { id: string; symbol: string; direction: 'buy' | 'sell' };

export default function ExecutionWidgetScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [symbol, setSymbol] = useState('EURUSD');
  const [direction, setDirection] = useState<'buy' | 'sell'>('buy');
  const [lot, setLot] = useState('');
  const [entry, setEntry] = useState('');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [exitPrice, setExitPrice] = useState(''); // đóng lệnh (tùy chọn)
  const [suggestedPlan, setSuggestedPlan] = useState<LinkedPlan | null>(null);
  const [linkPlan, setLinkPlan] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openedAt] = useState(() => new Date().toISOString());

  useEffect(() => {
    // Ghi mốc mở widget → đo AC "≤ 20 giây" (so với execution_saved).
    trackEvent(EXECUTION_EVENTS.WIDGET_OPENED);
  }, []);

  // Auto-suggest link plan: plan gần nhất chưa link, khớp Symbol + Direction.
  const findSuggestedPlan = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('trade_plans')
      .select('id, symbol, direction')
      .eq('user_id', user.id)
      .eq('symbol', symbol)
      .eq('direction', direction)
      .eq('status', 'planned')
      .order('created_at', { ascending: false })
      .limit(1);
    setSuggestedPlan((data?.[0] as LinkedPlan) ?? null);
  }, [user, symbol, direction]);

  useEffect(() => {
    // Fetch-on-mount: setState xảy ra sau await (async)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    findSuggestedPlan();
  }, [findSuggestedPlan]);

  async function handleSave() {
    const lotNum = parseDecimalInput(lot);
    const entryNum = parseDecimalInput(entry);
    if (!isSupportedSymbol(symbol) || !(lotNum != null && lotNum > 0) || !(entryNum != null && entryNum > 0)) {
      setError(t('executionWidget.fillError'));
      return;
    }
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const exitNum = exitPrice ? parseDecimalInput(exitPrice) : null;
      const slNum = sl ? parseDecimalInput(sl) : null;
      const tpNum = tp ? parseDecimalInput(tp) : null;
      // Tính actual_risk_percent ngược từ lot + SL + balance (P0-A fix:
      // trước đây luôn null → followed_plan luôn false). Thiếu SL/balance → null,
      // không suy đoán — compute-deltas sẽ backfill nếu có thể.
      let actualRisk: number | null = null;
      if (slNum != null && isSupportedSymbol(symbol)) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('account_balance_baseline')
          .eq('id', user.id)
          .maybeSingle();
        const balance = profile?.account_balance_baseline as number | null;
        if (balance != null) {
          actualRisk = calculateActualRiskPercent({
            lotSize: lotNum,
            symbol,
            entry: entryNum,
            sl: slNum,
            balance,
          });
        }
      }
      const { data: inserted, error: e } = await supabase
        .from('trade_executions')
        .insert({
          user_id: user.id,
          trade_plan_id: linkPlan && suggestedPlan ? suggestedPlan.id : null,
          symbol,
          direction,
          lot_size: lotNum,
          actual_entry: entryNum,
          actual_sl: slNum,
          actual_tp: tpNum,
          actual_risk_percent: actualRisk,
          entry_time: new Date().toISOString(),
          exit_time: exitNum != null ? new Date().toISOString() : null,
          exit_price: exitNum,
          source: 'mobile_widget',
        })
        .select('id, trade_plan_id, exit_time')
        .single();
      if (e) throw e;

      // Auto-trigger khi trade ĐÓNG: tính delta (Module 6) + detect violations (Module 7).
      // Chạy fire-and-forget — không chặn luồng chính nếu edge chưa deploy.
      if (inserted?.exit_time) {
        if (inserted?.trade_plan_id) {
          supabase.functions.invoke('compute-deltas', {
            body: { executionId: inserted.id },
          }).catch(() => {});
        }
        // Behavior Engine: detect-violations tự check điều kiện (overconfidence cần
        // plan, revenge/martingale/hope không cần) — chạy cho MỌI lệnh đóng.
        supabase.functions.invoke('detect-violations', {
          body: { executionId: inserted.id },
        }).catch(() => {});
      }

      // Đánh dấu plan đã được thực hiện — nếu không, plan vẫn status='planned'
      // và bị widget suggest lại nhiều lần (bug review 2026-08-17).
      if (inserted?.trade_plan_id) {
        const { error: planErr } = await supabase
          .from('trade_plans')
          .update({ status: 'executed' })
          .eq('id', inserted.trade_plan_id);
        if (planErr) {
          // Không chặn luồng chính — chỉ warn (plan có thể bị suggest lại lần sau)
          console.warn('Không cập nhật được trade_plans.status:', planErr.message);
        }
      }
      // Đo thời gian mở→lưu (AC ≤ 20 giây)
      await trackEvent(EXECUTION_EVENTS.SAVED, {
        opened_at: openedAt,
        saved_at: new Date().toISOString(),
        linked_plan: Boolean(linkPlan && suggestedPlan),
      });
      // Vừa đóng lệnh → re-sync evening review (hôm nay đã có lệnh đóng → gửi tối nay)
      syncEveningNotification().catch(() => {});
      safeBack(router, '/(main)');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('executionWidget.title')}</Text>
      <Text style={styles.subtitle}>{t('executionWidget.subtitle')}</Text>

      <Text style={styles.label}>Symbol</Text>
      <View style={styles.row}>
        {['EURUSD', 'XAUUSD', 'USDJPY'].map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, symbol === s && styles.chipActive]}
            onPress={() => setSymbol(s)}
          >
            <Text style={[styles.chipText, symbol === s && styles.chipTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Direction</Text>
      <View style={styles.row}>
        {(['buy', 'sell'] as const).map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.chip, direction === d && styles.chipActive]}
            onPress={() => setDirection(d)}
          >
            <Text style={[styles.chipText, direction === d && styles.chipTextActive]}>
              {d.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.row3}>
        <View style={styles.third}>
          <Text style={styles.label}>Lot</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={lot}
            onChangeText={setLot}
            placeholder="0.10"
            placeholderTextColor="#888"
          />
        </View>
        <View style={styles.third}>
          <Text style={styles.label}>Entry</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={entry}
            onChangeText={setEntry}
            placeholder="1.1000"
            placeholderTextColor="#888"
          />
        </View>
        <View style={styles.third}>
          <Text style={styles.label}>SL</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={sl}
            onChangeText={setSl}
            placeholder="1.0950"
            placeholderTextColor="#888"
          />
        </View>
      </View>

      <Text style={styles.label}>{t('executionWidget.tpLabel')}</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={tp}
        onChangeText={setTp}
        placeholder="1.1100"
        placeholderTextColor="#888"
      />

      <Text style={styles.label}>{t('executionWidget.exitPriceLabel')}</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={exitPrice}
        onChangeText={setExitPrice}
        placeholder="1.1120"
        placeholderTextColor="#888"
      />

      {suggestedPlan && (
        <TouchableOpacity
          style={[styles.linkBox, linkPlan && styles.linkBoxActive]}
          onPress={() => setLinkPlan((v) => !v)}
        >
          <Text style={styles.linkText}>
            {linkPlan ? '✓ ' : ''}
            {t('executionWidget.linkPlan', {
              symbol: suggestedPlan.symbol,
              direction: suggestedPlan.direction.toUpperCase(),
            })}
          </Text>
        </TouchableOpacity>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.disabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{t('executionWidget.saveTrade')}</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.pasteLink} onPress={() => router.push('/(main)/paste-mt4')}>
        <Text style={styles.pasteText}>{t('executionWidget.pasteLink')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 13, opacity: 0.7, textAlign: 'center', marginTop: 4, marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  row3: { flexDirection: 'row', gap: 8 },
  third: { flex: 1, minWidth: 90 },
  chip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 6,
  },
  chipActive: { borderColor: '#208AEF', backgroundColor: '#EAF3FF' },
  chipText: { fontSize: 13 },
  chipTextActive: { color: '#208AEF', fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  linkBox: {
    borderWidth: 1,
    borderColor: '#208AEF',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  linkBoxActive: { backgroundColor: '#EAF3FF' },
  linkText: { color: '#208AEF', fontSize: 14, fontWeight: '600' },
  error: { color: '#d33', fontSize: 13, marginTop: 8, textAlign: 'center' },
  saveBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  disabled: { opacity: 0.6 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  pasteLink: { marginTop: 14, alignItems: 'center', padding: 10 },
  pasteText: { color: '#6c757d', fontSize: 14, fontWeight: '600' },
});
