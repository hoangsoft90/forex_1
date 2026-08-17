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

import TradingViewChart from '@/components/tradingview-chart';
import { AdaptiveCondition, suggestAdaptiveRisk } from '@/lib/atr';
import { checkInterruption, ClosedExecution, Interruption } from '@/lib/interruption';
import { useAuth } from '@/lib/auth-context';
import { safeBack } from '@/lib/navigation';
import {
  calculateLotSize,
  calculateRiskAmount,
  calculateRiskReward,
  distanceInPips,
  isRiskOverLimit,
  isSupportedSymbol,
  SymbolKey,
} from '@/lib/risk-engine';
import { supabase } from '@/lib/supabase';

const SETUP_TAGS = ['breakout', 'rejection', 'trend_continuation', 'other'];
const DIRECTIONS = ['buy', 'sell'];

export default function NewPlanScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [maxRiskRule, setMaxRiskRule] = useState<number | null>(null);
  const [maxDailyRule, setMaxDailyRule] = useState<number | null>(null);
  const [balance, setBalance] = useState<number>(0);

  // Form state
  const [symbol, setSymbol] = useState('EURUSD');
  const [direction, setDirection] = useState<'buy' | 'sell'>('buy');
  const [thesis, setThesis] = useState('');
  const [setupTag, setSetupTag] = useState('breakout');
  const [entry, setEntry] = useState('');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [riskPercent, setRiskPercent] = useState('');
  const [invalidation, setInvalidation] = useState('');
  const [confidence, setConfidence] = useState(3);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interruption, setInterruption] = useState<Interruption | null>(null);
  // Phase 2: adaptive condition + kết quả đề xuất ATR
  const [adaptiveCondition, setAdaptiveCondition] = useState<AdaptiveCondition | null>(null);

  const loadConfig = useCallback(async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('account_balance_baseline')
      .eq('id', user.id)
      .maybeSingle();
    setBalance(profile?.account_balance_baseline ?? 0);

    const { data: rule } = await supabase
      .from('trading_rules')
      .select('base_value')
      .eq('user_id', user.id)
      .eq('rule_type', 'max_risk_per_trade')
      .eq('is_active', true)
      .maybeSingle();
    setMaxRiskRule(rule?.base_value ?? null);

    const { data: dailyRule } = await supabase
      .from('trading_rules')
      .select('base_value')
      .eq('user_id', user.id)
      .eq('rule_type', 'max_daily_loss')
      .eq('is_active', true)
      .maybeSingle();
    setMaxDailyRule(dailyRule?.base_value ?? null);

    // Phase 2: tải adaptive condition của rule max_risk_per_trade (nếu có)
    const { data: riskRule } = await supabase
      .from('trading_rules')
      .select('id, base_value')
      .eq('user_id', user.id)
      .eq('rule_type', 'max_risk_per_trade')
      .eq('is_active', true)
      .maybeSingle();
    if (riskRule) {
      const { data: ac } = await supabase
        .from('rule_adaptive_conditions')
        .select('id, condition_type, condition_operator, condition_value, adjusted_value')
        .eq('rule_id', riskRule.id)
        .maybeSingle();
      if (ac) {
        setAdaptiveCondition(ac as unknown as AdaptiveCondition);
      } else {
        setAdaptiveCondition(null);
      }
    } else {
      setAdaptiveCondition(null);
    }
  }, [user]);

  useEffect(() => {
    // Fetch-on-mount: setState xảy ra sau await (async)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadConfig();
  }, [loadConfig]);

  const entryNum = parseFloat(entry);
  const slNum = parseFloat(sl);
  const tpNum = tp ? parseFloat(tp) : null;
  const riskNum = parseFloat(riskPercent);
  const hasValidInputs =
    isSupportedSymbol(symbol) &&
    entryNum > 0 &&
    slNum > 0 &&
    entryNum !== slNum &&
    riskNum > 0;

  const lotSize = hasValidInputs
    ? calculateLotSize({
        balance,
        riskPercent: riskNum,
        symbol: symbol as SymbolKey,
        entry: entryNum,
        sl: slNum,
      })
    : 0;

  const riskAmount = riskNum > 0 && balance > 0 ? calculateRiskAmount(balance, riskNum) : 0;
  const rr = hasValidInputs ? calculateRiskReward(entryNum, slNum, tpNum) : null;
  const pips = hasValidInputs ? distanceInPips(symbol as SymbolKey, entryNum, slNum) : 0;
  const overLimit = maxRiskRule != null && riskNum > 0 && isRiskOverLimit(riskNum, maxRiskRule);

  async function loadClosedExecutions(): Promise<ClosedExecution[]> {
    if (!user) return [];
    const { data } = await supabase
      .from('trade_executions')
      .select('id, symbol, direction, lot_size, pnl_amount, entry_time, exit_time, trade_plan_id')
      .eq('user_id', user.id)
      .not('exit_time', 'is', null)
      .order('entry_time', { ascending: false })
      .limit(100);
    return (data ?? []) as ClosedExecution[];
  }

  /** Tính tổng lỗ hôm nay (USD) từ các lệnh đóng trong ngày có pnl < 0. */
  async function loadTodayLoss(): Promise<number> {
    if (!user) return 0;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from('trade_executions')
      .select('pnl_amount')
      .eq('user_id', user.id)
      .gte('exit_time', startOfDay.toISOString())
      .lt('pnl_amount', 0);
    return (data ?? []).reduce((s, e) => s + (e.pnl_amount ?? 0), 0);
  }

  // Phase 2: ATR hiện tại ước lượng theo symbol (giá trị tham chiếu, đánh dấu rõ trong UI).
  const estimatedATR = useCallback((sym: string): { atrNow: number; atrAvg: number } => {
    // Giá trị ước lượng theo biến động đặc trưng từng cặp — CHƯA phải dữ liệu thật.
    // Phase 2 chỉ minh họa cơ chế adaptive; Phase 3+ thay bằng nguồn giá thật.
    switch (sym) {
      case 'XAUUSD':
        return { atrNow: 24, atrAvg: 15 }; // vàng biến động mạnh hiện tại
      case 'USDJPY':
        return { atrNow: 0.9, atrAvg: 0.8 };
      default:
        return { atrNow: 0.0018, atrAvg: 0.0012 }; // EURUSD
    }
  }, []);

  // Chạy đề xuất adaptive mỗi khi symbol / adaptiveCondition đổi.
  // Lưu ý: đây là derived state (sync) — dùng trực tiếp trong render thay vì setState.
  const adaptiveSuggestionValue =
    !adaptiveCondition || maxRiskRule == null
      ? null
      : suggestAdaptiveRisk(
          maxRiskRule,
          adaptiveCondition,
          estimatedATR(symbol).atrNow,
          estimatedATR(symbol).atrAvg,
        );

  async function handleSave() {
    if (!hasValidInputs) {
      setError('Vui lòng nhập đầy đủ Symbol, Direction, Entry, SL, Risk% hợp lệ.');
      return;
    }
    if (!user) return;
    setError(null);

    // Phase 2: nếu adaptive kích hoạt và user nhập risk > đề xuất → chặn (phải giảm hoặc ghi lý do)
    if (adaptiveSuggestionValue?.active && riskNum > adaptiveSuggestionValue.suggestedRiskPercent) {
      setError(
        `Adaptive đang kích hoạt: risk đề xuất ${adaptiveSuggestionValue.suggestedRiskPercent}% (giảm theo ATR). Bạn nhập ${riskNum}% — vượt đề xuất. Giảm xuống hoặc quay lại chỉnh.`,
      );
      return;
    }

    // ---- Module 4: Decision Interruption (chạy TRƯỚC khi xác nhận lệnh) ----
    const [closedExecutions, todayLoss] = await Promise.all([
      loadClosedExecutions(),
      loadTodayLoss(),
    ]);
    const maxDailyLossAmount =
      balance > 0 ? balance * ((maxDailyRule ?? 3) / 100) : null;
    const check = checkInterruption({
      planRiskPercent: riskNum,
      maxRiskPercent: maxRiskRule,
      todayLossAmount: todayLoss,
      maxDailyLossAmount,
      closedExecutions,
      newPlanDirection: direction,
    });
    if (check) {
      setInterruption(check); // hiển thị trước khi user có thể lưu
      return;
    }
    await savePlan();
  }

  /** Lưu plan + ghi decision_interruption nếu user chọn "Tiếp tục" sau interruption. */
  async function savePlan(interruptionResult: Interruption | null = null) {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const { error: e } = await supabase.from('trade_plans').insert({
        user_id: user.id,
        symbol,
        direction,
        thesis: thesis || null,
        setup_tag: setupTag,
        planned_entry: entryNum,
        planned_sl: slNum,
        planned_tp: tpNum,
        planned_risk_percent: riskNum,
        invalidation_condition: invalidation || null,
        confidence_level: confidence,
        applied_adaptive_condition_id: adaptiveSuggestionValue?.active ? adaptiveSuggestionValue.appliedConditionId : null,
        status: 'planned',
      });
      if (e) throw e;

      if (interruptionResult) {
        await supabase.from('decision_interruptions').insert({
          user_id: user.id,
          trigger_type: interruptionResult.triggerType,
          evidence_mode: interruptionResult.evidenceMode,
          evidence_text: interruptionResult.evidenceText,
          user_decision: 'proceeded',
          shown_at: new Date().toISOString(),
          responded_at: new Date().toISOString(),
        });
      }
      safeBack(router, '/(main)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Có lỗi khi lưu plan.');
    } finally {
      setSaving(false);
    }
  }

  async function handleProceedAfterInterruption() {
    setInterruption(null);
    await savePlan(interruption);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Tạo Trade Plan</Text>
      <Text style={styles.subtitle}>
        Lập kế hoạch TRƯỚC khi vào lệnh — Risk Engine tính lot size tự động.
      </Text>

      {/* Symbol + Direction */}
      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>Symbol</Text>
          {['EURUSD', 'XAUUSD', 'USDJPY'].map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, symbol === s && styles.chipActive]}
              onPress={() => setSymbol(s)}
            >
              <Text style={[styles.chipText, symbol === s && styles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
          {!isSupportedSymbol(symbol) && (
            <Text style={styles.warn}>Symbol chưa có cấu hình pip value.</Text>
          )}
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>Direction</Text>
          {DIRECTIONS.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.chip, direction === d && styles.chipActive]}
              onPress={() => setDirection(d as 'buy' | 'sell')}
            >
              <Text style={[styles.chipText, direction === d && styles.chipTextActive]}>
                {d.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.label}>Thesis (lý do vào lệnh)</Text>
      <TextInput
        style={styles.input}
        placeholder="VD: Breakout khỏi vùng tích lũy H4"
        placeholderTextColor="#888"
        value={thesis}
        onChangeText={setThesis}
        multiline
      />

      <Text style={styles.label}>Setup tag</Text>
      <View style={styles.row}>
        {SETUP_TAGS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, setupTag === t && styles.chipActive]}
            onPress={() => setSetupTag(t)}
          >
            <Text style={[styles.chipText, setupTag === t && styles.chipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* TradingView chart — hiển thị giá symbol đang chọn (Phase 2) */}
      <Text style={styles.label}>Chart {symbol}</Text>
      <TradingViewChart symbol={symbol} height={220} />

      {/* Entry / SL / TP */}
      <View style={styles.row}>
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
        <View style={styles.third}>
          <Text style={styles.label}>TP (tùy chọn)</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={tp}
            onChangeText={setTp}
            placeholder="1.1150"
            placeholderTextColor="#888"
          />
        </View>
      </View>

      {/* Risk % */}
      <Text style={styles.label}>
        Risk % {maxRiskRule != null ? `(giới hạn của bạn: ${maxRiskRule}%)` : ''}
      </Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={riskPercent}
        onChangeText={setRiskPercent}
        placeholder="1"
        placeholderTextColor="#888"
      />
      {overLimit && (
        <Text style={styles.overRisk}>
          ⚠ Risk {riskNum}% vượt quá giới hạn {maxRiskRule}% — bạn phải giảm xuống hoặc quay lại.
        </Text>
      )}

      {/* Phase 2: adaptive ATR suggestion */}
      {adaptiveSuggestionValue?.active && (
        <View style={styles.adaptiveBanner}>
          <Text style={styles.adaptiveBannerTitle}>📉 Adaptive theo ATR đang kích hoạt</Text>
          <Text style={styles.adaptiveBannerText}>{adaptiveSuggestionValue.reason}</Text>
          <Text style={styles.adaptiveBannerNote}>
            Risk đề xuất: {adaptiveSuggestionValue.suggestedRiskPercent}% — nếu nhập cao hơn sẽ bị chặn
            (App không bao giờ tự nới lỏng luật). ATR là giá trị ước lượng tham chiếu.
          </Text>
        </View>
      )}

      {/* Risk Engine kết quả */}
      {hasValidInputs && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>Risk Engine</Text>
          <Text style={styles.resultLine}>Khoảng cách: {pips.toFixed(0)} pips</Text>
          <Text style={styles.resultLine}>Lot size đề xuất: {lotSize.toFixed(2)} lot</Text>
          <Text style={styles.resultLine}>Số tiền risk: ${riskAmount.toFixed(2)}</Text>
          {rr != null && <Text style={styles.resultLine}>R:R = 1 : {rr.toFixed(2)}</Text>}
        </View>
      )}

      <Text style={styles.label}>Invalidation condition (điều kiện hủy)</Text>
      <TextInput
        style={styles.input}
        placeholder="VD: mất vùng 1.0950"
        placeholderTextColor="#888"
        value={invalidation}
        onChangeText={setInvalidation}
      />

      <Text style={styles.label}>Confidence level: {confidence}/5</Text>
      <View style={styles.row}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity
            key={n}
            style={[styles.confBtn, confidence === n && styles.confBtnActive]}
            onPress={() => setConfidence(n)}
          >
            <Text style={[styles.confText, confidence === n && styles.confTextActive]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.saveBtn, (saving || overLimit) && styles.btnDisabled]}
        onPress={handleSave}
        disabled={saving || overLimit}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Lưu Plan</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.noPlan} onPress={() => router.push('/(main)/confirm-no-plan')}>
        <Text style={styles.noPlanText}>Tạo lệnh không có Plan →</Text>
      </TouchableOpacity>

      {/* ---- Module 4: Decision Interruption UI (hiển thị TRƯỚC khi lưu) ---- */}
      {interruption && (
        <View style={styles.interruptionOverlay}>
          <View style={styles.interruptionCard}>
            <Text style={styles.interruptionBadge}>
              {interruption.evidenceMode === 'personal' ? 'DỮ LIỆU CỦA BẠN' : 'BENCHMARK CỘNG ĐỒNG'}
            </Text>
            <Text style={styles.interruptionTitle}>Dừng lại 1 giây</Text>
            <Text style={styles.interruptionText}>{interruption.evidenceText}</Text>
            <TouchableOpacity
              style={styles.interruptionDanger}
              onPress={handleProceedAfterInterruption}
            >
              <Text style={styles.interruptionDangerText}>Tiếp tục</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.interruptionCancel}
              onPress={() => setInterruption(null)}
            >
              <Text style={styles.interruptionCancelText}>Quay lại chỉnh Plan</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    marginBottom: 16,
    lineHeight: 19,
  },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  row: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  half: { flex: 1, minWidth: 120 },
  third: { flex: 1, minWidth: 90 },
  chip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  chipActive: { borderColor: '#208AEF', backgroundColor: '#EAF3FF' },
  chipText: { fontSize: 13 },
  chipTextActive: { color: '#208AEF', fontWeight: '600' },
  warn: { color: '#d33', fontSize: 12 },
  overRisk: { color: '#d33', fontSize: 13, marginTop: 6, fontWeight: '600' },
  adaptiveBanner: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#F5C542',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    gap: 4,
  },
  adaptiveBannerTitle: { fontSize: 13, fontWeight: '700', color: '#8a6d3b' },
  adaptiveBannerText: { fontSize: 12, lineHeight: 18 },
  adaptiveBannerNote: { fontSize: 11, opacity: 0.7, lineHeight: 16 },
  resultBox: {
    backgroundColor: '#F0F6FF',
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
    gap: 2,
  },
  resultTitle: { fontSize: 15, fontWeight: '700', color: '#208AEF', marginBottom: 4 },
  resultLine: { fontSize: 14 },
  confBtn: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    width: 44,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confBtnActive: { borderColor: '#208AEF', backgroundColor: '#EAF3FF' },
  confText: { fontSize: 15 },
  confTextActive: { color: '#208AEF', fontWeight: '700' },
  error: { color: '#d33', fontSize: 13, marginTop: 8, textAlign: 'center' },
  saveBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  btnDisabled: { opacity: 0.5 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  noPlan: { marginTop: 12, alignItems: 'center', padding: 10 },
  noPlanText: { color: '#8a6d3b', fontSize: 14, fontWeight: '600' },
  interruptionOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  interruptionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  interruptionBadge: {
    color: '#8a6d3b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  interruptionTitle: { fontSize: 20, fontWeight: '800', color: '#d9534f' },
  interruptionText: { fontSize: 14, lineHeight: 22, opacity: 0.9 },
  interruptionDanger: {
    backgroundColor: '#d9534f',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  interruptionDangerText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  interruptionCancel: { alignItems: 'center', padding: 10 },
  interruptionCancelText: { color: '#208AEF', fontSize: 15, fontWeight: '600' },
});
