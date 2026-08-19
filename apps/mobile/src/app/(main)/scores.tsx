import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/lib/auth-context';
import {
  computeDisciplineScore,
  computeEdgeScore,
  weekBounds,
} from '@/lib/discipline-score';
import { supabase } from '@/lib/supabase';

type WeekData = {
  discipline: { score: number; adherence: number; violations: number; prevented: number } | null;
  edge: { winrate: number; avgRR: number | null; totalPnl: number } | null;
  prevDiscipline: number | null;
};

export default function ScoresScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState<WeekData | null>(null);
  const [tier, setTier] = useState('free');
  const [loading, setLoading] = useState(true);

  const loadScores = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // Timezone user (P1-4): tuần tính theo calendar date trong user_profiles.timezone.
    const { data: tzRow } = await supabase
      .from('user_profiles')
      .select('timezone')
      .eq('id', user.id)
      .maybeSingle();
    const timezone = tzRow?.timezone as string | undefined;
    const { start, end } = weekBounds(new Date(), timezone);

    const [{ data: profile }, { data: executions }, { data: deltas }, { data: violations }, { data: interruptions }] =
      await Promise.all([
        supabase.from('user_profiles').select('subscription_tier').eq('id', user.id).maybeSingle(),
        supabase
          .from('trade_executions')
          .select('id, trade_plan_id, pnl_amount, exit_time')
          .eq('user_id', user.id)
          .not('exit_time', 'is', null)
          .gte('exit_time', `${start}T00:00:00`)
          .lte('exit_time', `${end}T23:59:59`),
        supabase.from('plan_vs_reality_deltas').select('trade_execution_id, followed_plan').eq('user_id', user.id),
        supabase.from('rule_violations').select('id').eq('user_id', user.id).gte('detected_at', `${start}T00:00:00`).lte('detected_at', `${end}T23:59:59`),
        supabase
          .from('decision_interruptions')
          .select('user_decision')
          .eq('user_id', user.id)
          .in('user_decision', ['cancelled', 'reduced_risk'])
          .gte('responded_at', `${start}T00:00:00`)
          .lte('responded_at', `${end}T23:59:59`),
      ]);

    setTier(profile?.subscription_tier ?? 'free');

    // Discipline: lệnh tuần này có plan + delta CỦA TUẦN NÀY (không tính delta lịch sử)
    const execList = (executions ?? []) as { id: string; trade_plan_id: string | null; pnl_amount: number | null }[];
    const plannedExecs = execList.filter((e) => e.trade_plan_id);
    const totalPlanned = plannedExecs.length;
    const weekPlanIds = new Set(plannedExecs.map((e) => e.id));
    const weekDeltas = (deltas ?? []).filter((d) => weekPlanIds.has(d.trade_execution_id));
    const followedCount = weekDeltas.filter((d) => d.followed_plan === true).length;
    const violationsCount = violations?.length ?? 0;
    const prevented = interruptions?.length ?? 0;

    const discipline = computeDisciplineScore({
      followedPlanCount: followedCount,
      totalPlannedCount: totalPlanned,
      violationsCount,
    });

    const edge = computeEdgeScore({
      pnls: execList.map((e) => e.pnl_amount ?? 0),
      riskRewards: [], // Phase 1: chưa lưu R:R theo lệnh trong execution — dùng 0
    });

    // Tiến bộ tuần này: so với snapshot tuần trước
    const prevWeek = new Date();
    prevWeek.setDate(prevWeek.getDate() - 7);
    const prevBounds = weekBounds(prevWeek, timezone);
    const { data: prevSnapshot } = await supabase
      .from('discipline_score_snapshots')
      .select('score')
      .eq('user_id', user.id)
      .eq('period_start', prevBounds.start)
      .maybeSingle();

    // Ghi snapshot tuần này — UPSERT (P1-3): trước đây insert-only nên nếu mở app
    // nhiều lần trong tuần, snapshot giữ nguyên điểm cũ (VD 0 khi chưa có lệnh) dù
    // user đã thêm lệnh/violation giữa tuần. Giờ cập nhật điểm mới nhất của tuần.
    const { data: existingSnapshot } = await supabase
      .from('discipline_score_snapshots')
      .select('id')
      .eq('user_id', user.id)
      .eq('period_start', start)
      .maybeSingle();
    if (existingSnapshot) {
      await supabase
        .from('discipline_score_snapshots')
        .update({
          period_end: end,
          score: discipline.score,
          rule_adherence_rate: discipline.ruleAdherenceRate,
          violations_count: violationsCount,
          bad_trades_prevented_count: prevented,
        })
        .eq('id', existingSnapshot.id);
    } else {
      await supabase.from('discipline_score_snapshots').insert({
        user_id: user.id,
        period_start: start,
        period_end: end,
        score: discipline.score,
        rule_adherence_rate: discipline.ruleAdherenceRate,
        violations_count: violationsCount,
        bad_trades_prevented_count: prevented,
      });
    }

    setData({
      discipline: {
        score: discipline.score,
        adherence: discipline.ruleAdherenceRate,
        violations: violationsCount,
        prevented,
      },
      edge: { winrate: edge.winrate, avgRR: edge.avgRiskReward, totalPnl: edge.totalPnl },
      prevDiscipline: prevSnapshot?.score ?? null,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadScores();
  }, [loadScores]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!data) return null;

  const progress =
    data.prevDiscipline != null && data.discipline
      ? data.discipline.score - data.prevDiscipline
      : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('scores.title')}</Text>
      <Text style={styles.subtitle}>{t('scores.subtitle')}</Text>

      <View style={styles.scoresRow}>
        <View style={[styles.scoreCard, styles.disciplineCard]}>
          <Text style={styles.scoreLabel}>Discipline</Text>
          <Text style={styles.scoreValue}>{data.discipline?.score ?? 0}</Text>
          <Text style={styles.scoreDetail}>/100</Text>
        </View>
        <View style={[styles.scoreCard, styles.edgeCard]}>
          <Text style={styles.scoreLabel}>Edge</Text>
          <Text style={styles.scoreValue}>{data.edge?.winrate ?? 0}%</Text>
          <Text style={styles.scoreDetail}>{t('scores.winrate')}</Text>
        </View>
      </View>

      {/* Tiến bộ tuần này (so với chính user tuần trước, tách riêng) */}
      {progress != null && (
        <View style={styles.progressBox}>
          <Text style={styles.progressTitle}>{t('scores.progressTitle')}</Text>
          <Text style={styles.progressText}>
            {t('scores.progressText', {
              delta: progress >= 0 ? `+${progress.toFixed(1)}` : progress.toFixed(1),
              prev: data.prevDiscipline?.toFixed(1),
              cur: data.discipline?.score.toFixed(1),
            })}
          </Text>
        </View>
      )}

      {tier === 'free' ? (
        <Text style={styles.tierNote}>{t('scores.tierNote')}</Text>
      ) : (
        <View style={styles.proBox}>
          <Text style={styles.proTitle}>✨ {t('scores.proTitle')}</Text>
          <Text style={styles.proLine}>{t('scores.proPrevented', { count: data.discipline?.prevented ?? 0 })}</Text>
          <Text style={styles.proLine}>{t('scores.proChart')}</Text>
        </View>
      )}

      <View style={styles.detailBox}>
        <Text style={styles.detailTitle}>{t('scores.disciplineDetail')}</Text>
        <Text style={styles.detailLine}>{t('scores.adherence', { pct: data.discipline?.adherence ?? 0 })}</Text>
        <Text style={styles.detailLine}>{t('scores.violations', { count: data.discipline?.violations ?? 0 })}</Text>
      </View>

      <View style={styles.detailBox}>
        <Text style={styles.detailTitle}>{t('scores.edgeDetail')}</Text>
        <Text style={styles.detailLine}>{t('scores.pnlWeek', { amount: data.edge?.totalPnl.toFixed(2) ?? '0.00' })}</Text>
        <Text style={styles.detailLine}>{t('scores.avgRR', { rr: data.edge?.avgRR != null ? data.edge.avgRR.toFixed(2) : '—' })}</Text>
      </View>
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
  scoresRow: { flexDirection: 'row', gap: 12 },
  scoreCard: { flex: 1, borderRadius: 12, padding: 20, alignItems: 'center' },
  disciplineCard: { backgroundColor: '#EAF3FF' },
  edgeCard: { backgroundColor: '#F0F6F0' },
  scoreLabel: { fontSize: 13, fontWeight: '700', opacity: 0.7 },
  scoreValue: { fontSize: 40, fontWeight: '800', marginTop: 4 },
  scoreDetail: { fontSize: 12, opacity: 0.6 },
  progressBox: {
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
    gap: 4,
  },
  progressTitle: { fontSize: 14, fontWeight: '700', color: '#8a6d3b' },
  progressText: { fontSize: 13, lineHeight: 19 },
  tierNote: {
    fontSize: 12,
    color: '#6c757d',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    lineHeight: 18,
  },
  proBox: { backgroundColor: '#4A2E83', borderRadius: 10, padding: 14, marginTop: 12, gap: 4 },
  proTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  proLine: { fontSize: 13, color: '#E8E0F5', lineHeight: 19 },
  detailBox: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, marginTop: 12, gap: 4 },
  detailTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  detailLine: { fontSize: 13, opacity: 0.8 },
});
