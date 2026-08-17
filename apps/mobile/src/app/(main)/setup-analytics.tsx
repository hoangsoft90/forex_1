import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { bestSetupInsight, computeSetupAnalytics, SetupAnalyticsResult } from '@/lib/setup-analytics';
import { supabase } from '@/lib/supabase';

export default function SetupAnalyticsScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<SetupAnalyticsResult | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: profile }, { data: executions }, { data: plans }] = await Promise.all([
      supabase.from('user_profiles').select('subscription_tier').eq('id', user.id).maybeSingle(),
      supabase
        .from('trade_executions')
        .select('id, pnl_amount, actual_entry, actual_sl, actual_tp, trade_plan_id')
        .eq('user_id', user.id)
        .not('exit_time', 'is', null),
      supabase.from('trade_plans').select('id, setup_tag'),
    ]);

    setIsPro((profile?.subscription_tier ?? 'free') === 'pro');

    const execList = (executions ?? []) as {
      id: string;
      pnl_amount: number | null;
      actual_entry: number | null;
      actual_sl: number | null;
      actual_tp: number | null;
      trade_plan_id: string | null;
    }[];
    const planList = (plans ?? []) as { id: string; setup_tag: string | null }[];
    const setupByPlan = new Map(planList.map((p) => [p.id, p.setup_tag]));

    const result = computeSetupAnalytics({
      executions: execList.map((e) => ({
        id: e.id,
        pnl_amount: e.pnl_amount,
        actual_entry: e.actual_entry,
        actual_sl: e.actual_sl,
        actual_tp: e.actual_tp,
        setup_tag: e.trade_plan_id ? (setupByPlan.get(e.trade_plan_id) ?? null) : null,
      })),
    });
    setData(result);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!data) return null;

  const insight = isPro && data.showable ? bestSetupInsight(data.groups) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Setup Analytics</Text>
      <Text style={styles.subtitle}>
        Winrate, R:R và PnL theo từng loại setup — biết chiến lược nào thực sự có edge.
      </Text>

      {!data.showable ? (
        <View style={styles.progressBox}>
          <Text style={styles.progressText}>{data.progressText}</Text>
        </View>
      ) : (
        <>
          {insight && (
            <View style={styles.insightBox}>
              <Text style={styles.insightTitle}>💡 Gợi ý (Pro)</Text>
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          )}

          <View style={styles.tableBox}>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.colSetup]}>Setup</Text>
              <Text style={[styles.headerCell, styles.colNum]}>Lệnh</Text>
              <Text style={[styles.headerCell, styles.colNum]}>Winrate</Text>
              <Text style={[styles.headerCell, styles.colNum]}>Avg R:R</Text>
              <Text style={[styles.headerCell, styles.colNum]}>PnL</Text>
            </View>
            {data.groups.map((g) => (
              <View key={g.key} style={styles.tableRow}>
                <Text style={[styles.cell, styles.colSetup]}>{g.label}</Text>
                <Text style={[styles.cell, styles.colNum]}>{g.count}</Text>
                <Text style={[styles.cell, styles.colNum]}>{g.winrate.toFixed(0)}%</Text>
                <Text style={[styles.cell, styles.colNum]}>
                  {g.avgRiskReward != null ? g.avgRiskReward.toFixed(2) : '—'}
                </Text>
                <Text
                  style={[
                    styles.cell,
                    styles.colNum,
                    g.totalPnl >= 0 ? styles.pnlPos : styles.pnlNeg,
                  ]}
                >
                  {g.totalPnl >= 0 ? '+' : ''}${g.totalPnl.toFixed(0)}
                </Text>
              </View>
            ))}
          </View>

          {!isPro && (
            <Text style={styles.tierNote}>
              Gói Free xem bảng tổng quan. Nâng cấp Pro để nhận gợi ý dạng câu và biểu đồ xu hướng
              theo thời gian.
            </Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  subtitle: {
    fontSize: 13,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 19,
  },
  progressBox: {
    backgroundColor: '#F0F6FF',
    borderRadius: 10,
    padding: 16,
  },
  progressText: { fontSize: 14, lineHeight: 21, opacity: 0.85 },
  insightBox: {
    backgroundColor: '#4A2E83',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    gap: 4,
  },
  insightTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  insightText: { fontSize: 13, color: '#E8E0F5', lineHeight: 19 },
  tableBox: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f4f8',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  headerCell: { fontSize: 12, fontWeight: '700', opacity: 0.7 },
  cell: { fontSize: 13 },
  colSetup: { flex: 2 },
  colNum: { flex: 1, textAlign: 'right' },
  pnlPos: { color: '#28a745', fontWeight: '600' },
  pnlNeg: { color: '#d33', fontWeight: '600' },
  tierNote: {
    fontSize: 12,
    color: '#6c757d',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    lineHeight: 18,
  },
});
