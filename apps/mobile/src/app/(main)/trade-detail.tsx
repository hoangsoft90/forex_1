import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import TradingViewChart from '@/components/tradingview-chart';
import { useAuth } from '@/lib/auth-context';
import { missingOptionalDetails } from '@/lib/fast-plan';
import { safeBack } from '@/lib/navigation';
import { supabase } from '@/lib/supabase';

type Detail = {
  exec: {
    symbol: string;
    direction: 'buy' | 'sell';
    lot_size: number;
    actual_entry: number;
    actual_sl: number | null;
    actual_tp: number | null;
    exit_price: number | null;
    pnl_amount: number | null;
    entry_time: string;
    exit_time: string | null;
    source: string;
  } | null;
  plan: {
    planned_entry: number;
    planned_sl: number;
    planned_tp: number | null;
    planned_risk_percent: number;
    thesis: string | null;
    setup_tag: string | null;
    invalidation_condition: string | null;
    confidence_level: number | null;
  } | null;
  delta: { entry_deviation_pips: number | null; sl_deviation_pips: number | null; risk_deviation_percent: number | null; followed_plan: boolean | null } | null;
  actualRiskPercent: number | null;
};

export default function TradeDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDetail = useCallback(async () => {
    // Deep-link edge case: mở thẳng trade-detail mà thiếu id → về Journal thay vì treo.
    if (!id) {
      setLoading(false);
      safeBack(router, '/(main)/journal');
      return;
    }
    if (!user) return;
    setLoading(true);
    const { data: exec } = await supabase
      .from('trade_executions')
      .select(
        'symbol, direction, lot_size, actual_entry, actual_sl, actual_tp, exit_price, pnl_amount, entry_time, exit_time, source, actual_risk_percent, trade_plan_id',
      )
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    let plan = null;
    let delta = null;
    if (exec?.trade_plan_id) {
      const [planRes, deltaRes] = await Promise.all([
        supabase
          .from('trade_plans')
          .select('planned_entry, planned_sl, planned_tp, planned_risk_percent, thesis, setup_tag, invalidation_condition, confidence_level')
          .eq('id', exec.trade_plan_id)
          .maybeSingle(),
        supabase
          .from('plan_vs_reality_deltas')
          .select('entry_deviation_pips, sl_deviation_pips, risk_deviation_percent, followed_plan')
          .eq('trade_execution_id', id)
          .maybeSingle(),
      ]);
      plan = planRes.data;
      delta = deltaRes.data;
    }
    setDetail({ exec, plan, delta, actualRiskPercent: exec?.actual_risk_percent ?? null });
    setLoading(false);
  }, [id, user, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDetail();
  }, [loadDetail]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!detail?.exec) {
    // Deep-link edge: id không tồn tại hoặc không thuộc user → luôn có lối thoát.
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>{t('tradeDetail.notFound')}</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => safeBack(router, '/(main)/journal')}
        >
          <Text style={styles.backBtnText}>{t('tradeDetail.backToJournal')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { exec, plan, delta } = detail;
  const fmt = (n: number | null | undefined, digits = 5) => (n == null ? '—' : n.toFixed(digits));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        {exec.symbol} {exec.direction.toUpperCase()} · {exec.lot_size.toFixed(2)} lot
      </Text>
      <Text style={styles.subtitle}>
        {exec.source} · {t('tradeDetail.opened', { time: new Date(exec.entry_time).toLocaleString() })}
        {exec.exit_time
          ? ` · ${t('tradeDetail.closed', { time: new Date(exec.exit_time).toLocaleString() })}`
          : ` · ${t('tradeDetail.open')}`}
      </Text>

      <TradingViewChart symbol={exec.symbol} height={220} />

      {delta?.followed_plan != null && (
        <View style={[styles.badgeRow, delta.followed_plan ? styles.bgOk : styles.bgBad]}>
          <Text style={[styles.badgeText, delta.followed_plan ? styles.textOk : styles.textBad]}>
            {delta.followed_plan ? t('tradeDetail.onPlan') : t('tradeDetail.offPlan')}
          </Text>
        </View>
      )}

      <View style={styles.compareBox}>
        <Text style={styles.compareTitle}>{t('tradeDetail.compareTitle')}</Text>
        <View style={styles.compareRow}>
          <Text style={styles.compareCol}>Entry</Text>
          <Text style={styles.comparePlanned}>{fmt(plan?.planned_entry)}</Text>
          <Text style={styles.compareActual}>{fmt(exec.actual_entry)}</Text>
        </View>
        <View style={styles.compareRow}>
          <Text style={styles.compareCol}>SL</Text>
          <Text style={styles.comparePlanned}>{fmt(plan?.planned_sl)}</Text>
          <Text style={styles.compareActual}>{fmt(exec.actual_sl)}</Text>
        </View>
        <View style={styles.compareRow}>
          <Text style={styles.compareCol}>TP</Text>
          <Text style={styles.comparePlanned}>{fmt(plan?.planned_tp)}</Text>
          <Text style={styles.compareActual}>{fmt(exec.actual_tp)}</Text>
        </View>
        <View style={styles.compareRow}>
          <Text style={styles.compareCol}>Risk %</Text>
          <Text style={styles.comparePlanned}>{fmt(plan?.planned_risk_percent, 2)}%</Text>
          <Text style={styles.compareActual}>{fmt(detail.actualRiskPercent, 2)}%</Text>
        </View>
      </View>

      {delta && (
        <View style={styles.deltaBox}>
          <Text style={styles.deltaTitle}>{t('tradeDetail.deltaTitle')}</Text>
          <Text style={styles.deltaLine}>
            {t('tradeDetail.entryDelta', { value: fmt(delta.entry_deviation_pips, 2) })}
          </Text>
          <Text style={styles.deltaLine}>
            {t('tradeDetail.slDelta', { value: fmt(delta.sl_deviation_pips, 2) })}
          </Text>
          <Text style={styles.deltaLine}>
            {t('tradeDetail.riskDelta', {
              value:
                delta.risk_deviation_percent != null
                  ? `${delta.risk_deviation_percent >= 0 ? '+' : ''}${delta.risk_deviation_percent.toFixed(2)}%`
                  : '—',
            })}
          </Text>
        </View>
      )}

      {plan?.thesis && <Text style={styles.thesis}>{t('tradeDetail.thesis', { value: plan.thesis })}</Text>}
      {plan?.setup_tag && <Text style={styles.thesis}>{t('tradeDetail.setup', { value: plan.setup_tag })}</Text>}
      {plan?.invalidation_condition && (
        <Text style={styles.thesis}>
          {t('tradeDetail.invalidation', { value: plan.invalidation_condition })}
        </Text>
      )}

      {/* Retention Module 1: nhắc nhẹ (không chặn) điền bổ sung khi plan thiếu chi tiết */}
      {plan && missingOptionalDetails(plan).length > 0 && (
        <View style={styles.reminderBox}>
          <Text style={styles.reminderText}>
            {t('tradeDetail.reminder', { fields: missingOptionalDetails(plan).join(', ') })}
          </Text>
        </View>
      )}

      <Text style={[styles.pnl, (exec.pnl_amount ?? 0) >= 0 ? styles.pnlPos : styles.pnlNeg]}>
        {exec.pnl_amount != null
          ? `${t('tradeDetail.pnl')}: ${exec.pnl_amount >= 0 ? '+' : ''}$${exec.pnl_amount.toFixed(2)}`
          : `${t('tradeDetail.pnl')}: ${t('tradeDetail.notClosed')}`}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 48, gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { opacity: 0.6 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 12, opacity: 0.6, textAlign: 'center' },
  badgeRow: { borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 4 },
  bgOk: { backgroundColor: '#d4edda' },
  bgBad: { backgroundColor: '#f8d7da' },
  badgeText: { fontSize: 15, fontWeight: '800' },
  textOk: { color: '#155724' },
  textBad: { color: '#721c24' },
  compareBox: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, marginTop: 8, gap: 6 },
  compareTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  compareRow: { flexDirection: 'row', justifyContent: 'space-between' },
  compareCol: { fontSize: 13, opacity: 0.7, flex: 1 },
  comparePlanned: { fontSize: 13, color: '#6c757d', flex: 1, textAlign: 'right', paddingRight: 8 },
  compareActual: { fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' },
  deltaBox: { backgroundColor: '#F0F6FF', borderRadius: 10, padding: 14, gap: 4 },
  deltaTitle: { fontSize: 14, fontWeight: '700', color: '#208AEF' },
  deltaLine: { fontSize: 13 },
  thesis: { fontSize: 13, opacity: 0.8, marginTop: 4 },
  pnl: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: 8 },
  pnlPos: { color: '#28a745' },
  pnlNeg: { color: '#d33' },
  backBtn: { marginTop: 16, padding: 10 },
  backBtnText: { color: '#208AEF', fontSize: 15, fontWeight: '600' },
  reminderBox: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#F5C542',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  reminderText: { fontSize: 13, lineHeight: 19, color: '#8a6d3b' },
});
