import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { FAST_PLAN_EVENTS, trackEvent } from '@/lib/analytics';
import { checkInterruption, ClosedExecution, Interruption } from '@/lib/interruption';
import { useAuth } from '@/lib/auth-context';
import { validateFastPlan } from '@/lib/fast-plan';
import { safeBack } from '@/lib/navigation';
import { parseDecimalInput } from '@/lib/parse-number';
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
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [maxRiskRule, setMaxRiskRule] = useState<number | null>(null);
  const [maxDailyRule, setMaxDailyRule] = useState<number | null>(null);
  const [balance, setBalance] = useState<number>(0);

  // ---- 5 trường BẮT BUỘC hiển thị ngay ----
  const [symbol, setSymbol] = useState('EURUSD');
  const [direction, setDirection] = useState<'buy' | 'sell'>('buy');
  const [entry, setEntry] = useState('');
  const [sl, setSl] = useState('');
  const [riskPercent, setRiskPercent] = useState('');

  // ---- Trường tùy chọn (gấp gọn dưới "Chi tiết thêm") ----
  const [showDetails, setShowDetails] = useState(false);
  const [tp, setTp] = useState('');
  const [thesis, setThesis] = useState('');
  const [setupTag, setSetupTag] = useState('breakout');
  const [invalidation, setInvalidation] = useState('');
  const [confidence, setConfidence] = useState(3);

  const [saving, setSaving] = useState(false);
  // Chống double-submit: state update bất đồng bộ nên disabled={saving} chưa đủ —
  // tap nhanh 2 lần trong cùng frame sẽ lọt qua. Ref đồng bộ chặn ngay lần 2.
  const savingRef = useRef(false);
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
    const ruleVal = rule?.base_value ?? null;
    setMaxRiskRule(ruleVal);
    // Fast Plan: Risk% mặc định = max_risk_per_trade, cho phép sửa.
    // Chỉ prefill khi user chưa tự nhập gì.
    setRiskPercent((prev) => (prev === '' && ruleVal != null ? String(ruleVal) : prev));

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
    // AC Module 1: đo từ lúc mở form đến lúc lưu plan (≤ 15 giây).
    trackEvent(FAST_PLAN_EVENTS.OPENED, { source: 'fast-plan-screen' });
  }, [loadConfig]);

  const entryNum = parseDecimalInput(entry) ?? 0;
  const slNum = parseDecimalInput(sl) ?? 0;
  const tpNum = tp ? parseDecimalInput(tp) : null;
  const riskNum = parseDecimalInput(riskPercent) ?? 0;

  // Validate chặn cứng 5 trường (SL bắt buộc — bảo vệ Risk Engine, không thương lượng).
  const validation = validateFastPlan({ symbol, direction, entry, sl, riskPercent });
  const hasValidInputs = validation.ok;

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
  // R:R chỉ hiển thị khi có TP — TP là optional thật sự.
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
      setError(validation.ok ? t('newPlan.errorInvalid') : validation.reason);
      return;
    }
    if (!user) return;
    setError(null);

    // Phase 2: nếu adaptive kích hoạt và user nhập risk > đề xuất → chặn (phải giảm hoặc ghi lý do)
    if (adaptiveSuggestionValue?.active && riskNum > adaptiveSuggestionValue.suggestedRiskPercent) {
      setError(
        t('newPlan.errorAdaptive', {
          suggested: adaptiveSuggestionValue.suggestedRiskPercent,
          entered: riskNum,
        }),
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
    if (!user || savingRef.current) return;
    savingRef.current = true;
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
      // AC Module 1: đo thời gian từ mở form (fast_plan_opened) đến lưu (fast_plan_saved).
      await trackEvent(FAST_PLAN_EVENTS.SAVED, { symbol, direction, has_tp: tpNum != null, source: 'fast-plan-screen' });
      safeBack(router, '/(main)');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('newPlan.errorSave'));
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  }

  async function handleProceedAfterInterruption() {
    setInterruption(null);
    await savePlan(interruption);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('newPlan.title')}</Text>
      <Text style={styles.subtitle}>{t('newPlan.subtitle')}</Text>

      {/* Symbol + Direction — bắt buộc */}
      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>{t('newPlan.symbol')} *</Text>
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
            <Text style={styles.warn}>{t('newPlan.warnSymbol')}</Text>
          )}
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>{t('newPlan.direction')} *</Text>
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

      {/* Entry / SL — bắt buộc. SL chặn cứng. */}
      <View style={styles.row}>
        <View style={styles.third}>
          <Text style={styles.label}>{t('newPlan.entry')} *</Text>
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
          <Text style={styles.label}>{t('newPlan.sl')} *</Text>
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
          <Text style={styles.label}>{t('newPlan.riskPercent')} % *</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={riskPercent}
            onChangeText={setRiskPercent}
            placeholder={maxRiskRule != null ? String(maxRiskRule) : '1'}
            placeholderTextColor="#888"
          />
        </View>
      </View>
      {maxRiskRule != null && (
        <Text style={styles.hint}>{t('newPlan.riskHint', { rule: maxRiskRule })}</Text>
      )}
      {overLimit && (
        <Text style={styles.overRisk}>{t('newPlan.overRisk', { entered: riskNum, limit: maxRiskRule })}</Text>
      )}

      {/* Phase 2: adaptive ATR suggestion */}
      {adaptiveSuggestionValue?.active && (
        <View style={styles.adaptiveBanner}>
          <Text style={styles.adaptiveBannerTitle}>{t('newPlan.adaptiveTitle')}</Text>
          <Text style={styles.adaptiveBannerText}>{adaptiveSuggestionValue.reason}</Text>
          <Text style={styles.adaptiveBannerNote}>
            {t('newPlan.adaptiveNote', {
              suggested: adaptiveSuggestionValue.suggestedRiskPercent,
            })}
          </Text>
        </View>
      )}

      {/* Risk Engine kết quả — real-time như cũ, không đổi công thức */}
      {hasValidInputs && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>Risk Engine</Text>
          <Text style={styles.resultLine}>{t('newPlan.distance', { pips: pips.toFixed(0) })}</Text>
          <Text style={styles.resultLine}>{t('newPlan.lotSize', { lot: lotSize.toFixed(2) })}</Text>
          <Text style={styles.resultLine}>{t('newPlan.riskAmount', { amount: riskAmount.toFixed(2) })}</Text>
          {rr != null && <Text style={styles.resultLine}>{t('newPlan.rr', { rr: rr.toFixed(2) })}</Text>}
        </View>
      )}

      {/* Chi tiết thêm — gấp gọn, tùy chọn */}
      <TouchableOpacity style={styles.detailsToggle} onPress={() => setShowDetails((v) => !v)}>
        <Text style={styles.detailsToggleText}>
          {showDetails ? t('newPlan.hideDetails') : t('newPlan.showDetails')}
        </Text>
      </TouchableOpacity>
      {showDetails && (
        <View>
          <Text style={styles.label}>{t('newPlan.tpLabel')}</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={tp}
            onChangeText={setTp}
            placeholder="1.1150"
            placeholderTextColor="#888"
          />

          <Text style={styles.label}>{t('newPlan.thesisLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder="VD: Breakout khỏi vùng tích lũy H4"
            placeholderTextColor="#888"
            value={thesis}
            onChangeText={setThesis}
            multiline
          />

          <Text style={styles.label}>{t('newPlan.setupTagLabel')}</Text>
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

          <Text style={styles.label}>{t('newPlan.invalidationLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder="VD: mất vùng 1.0950"
            placeholderTextColor="#888"
            value={invalidation}
            onChangeText={setInvalidation}
          />

          <Text style={styles.label}>{t('newPlan.confidenceLabel', { level: confidence })}</Text>
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

          {/* TradingView chart — hiển thị giá symbol đang chọn (Phase 2) */}
          <Text style={styles.label}>{t('newPlan.chartLabel', { symbol })}</Text>
          <TradingViewChart symbol={symbol} height={320} />
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.saveBtn, (saving || overLimit) && styles.btnDisabled]}
        onPress={handleSave}
        disabled={saving || overLimit}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{t('newPlan.save')}</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.noPlan} onPress={() => router.push('/(main)/confirm-no-plan')}>
        <Text style={styles.noPlanText}>{t('newPlan.noPlan')} →</Text>
      </TouchableOpacity>

      {/* ---- Module 4: Decision Interruption UI (hiển thị TRƯỚC khi lưu) ---- */}
      {interruption && (
        <View style={styles.interruptionOverlay}>
          <View style={styles.interruptionCard}>
            <Text style={styles.interruptionBadge}>
              {interruption.evidenceMode === 'personal' ? t('newPlan.personalData') : t('newPlan.communityBenchmark')}
            </Text>
            <Text style={styles.interruptionTitle}>{t('newPlan.interruptionTitle')}</Text>
            <Text style={styles.interruptionText}>{interruption.evidenceText}</Text>
            <TouchableOpacity
              style={[styles.interruptionDanger, saving && styles.btnDisabled]}
              onPress={handleProceedAfterInterruption}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.interruptionDangerText}>{t('newPlan.continue')}</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.interruptionCancel}
              onPress={() => setInterruption(null)}
            >
              <Text style={styles.interruptionCancelText}>{t('newPlan.backToPlan')}</Text>
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
  hint: { fontSize: 11, opacity: 0.6, marginTop: 4 },
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
  detailsToggle: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginTop: 14,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  detailsToggleText: { fontSize: 14, fontWeight: '600', color: '#555' },
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
