import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { weekBounds } from '@/lib/discipline-score';
import { supabase } from '@/lib/supabase';
import { generateWeeklyAudit } from '@/lib/weekly-audit';

type AuditData = {
  text: string;
  totalTrades: number;
  followedPlanPercent: number;
  prevented: number;
};

export default function WeeklyAuditScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAudit = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { start, end } = weekBounds(new Date());

    const [{ data: executions }, { data: deltas }, { data: violations }, { data: interruptions }] =
      await Promise.all([
        supabase
          .from('trade_executions')
          .select('id, trade_plan_id, pnl_amount, exit_time')
          .eq('user_id', user.id)
          .not('exit_time', 'is', null)
          .gte('exit_time', `${start}T00:00:00`)
          .lte('exit_time', `${end}T23:59:59`),
        supabase.from('plan_vs_reality_deltas').select('trade_execution_id, followed_plan').eq('user_id', user.id),
        supabase
          .from('rule_violations')
          .select('violation_type, detected_at')
          .eq('user_id', user.id)
          .gte('detected_at', `${start}T00:00:00`)
          .lte('detected_at', `${end}T23:59:59`),
        supabase
          .from('decision_interruptions')
          .select('user_decision')
          .eq('user_id', user.id)
          .in('user_decision', ['cancelled', 'reduced_risk'])
          .gte('responded_at', `${start}T00:00:00`)
          .lte('responded_at', `${end}T23:59:59`),
      ]);

    const execList = (executions ?? []) as { id: string; trade_plan_id: string | null; pnl_amount: number | null }[];
    const totalTrades = execList.length;
    const weekPnl = execList.reduce((s, e) => s + (e.pnl_amount ?? 0), 0);

    // % theo plan CHỈ tính trên delta của các lệnh TUẦN NÀY (không gộp lịch sử)
    const weekIds = new Set(execList.map((e) => e.id));
    const weekDeltas = (deltas ?? []).filter((d) => weekIds.has(d.trade_execution_id));
    const followed = weekDeltas.filter((d) => d.followed_plan === true).length;
    const totalDelta = weekDeltas.length;
    const followedPlanPercent = totalDelta > 0 ? (followed / totalDelta) * 100 : 0;

    // Top violation
    const vCounts: Record<string, number> = {};
    for (const v of violations ?? []) {
      vCounts[v.violation_type] = (vCounts[v.violation_type] ?? 0) + 1;
    }
    const topViolationEntry = Object.entries(vCounts).sort((a, b) => b[1] - a[1])[0];
    const topViolation = topViolationEntry
      ? { type: topViolationEntry[0], count: topViolationEntry[1] }
      : null;

    const prevented = interruptions?.length ?? 0;

    const text = generateWeeklyAudit({
      totalTrades,
      followedPlanPercent,
      topViolation,
      badTradesPrevented: prevented,
      weekPnl,
    });

    setData({ text, totalTrades, followedPlanPercent, prevented });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAudit();
  }, [loadAudit]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!data) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Weekly Performance Audit</Text>
      <Text style={styles.subtitle}>Tổng kết tuần này — sinh từ số liệu thật, không dùng AI.</Text>

      <View style={styles.auditBox}>
        <Text style={styles.auditText}>{data.text}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{data.totalTrades}</Text>
          <Text style={styles.statLabel}>lệnh</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{data.followedPlanPercent.toFixed(0)}%</Text>
          <Text style={styles.statLabel}>theo plan</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{data.prevented}</Text>
          <Text style={styles.statLabel}>lệnh đã ngăn</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 13, opacity: 0.7, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  auditBox: {
    backgroundColor: '#F0F6FF',
    borderRadius: 12,
    padding: 18,
  },
  auditText: { fontSize: 15, lineHeight: 24 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  statBox: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 10, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 12, opacity: 0.7, marginTop: 2 },
});
