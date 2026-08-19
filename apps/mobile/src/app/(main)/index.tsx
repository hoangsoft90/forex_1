import { useRouter } from 'expo-router';
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

import CostOfIndisciplineCard from '@/components/cost-of-indiscipline-card';
import { useGuidance } from '@/components/guidance-context';
import { useAuth } from '@/lib/auth-context';
import { computeCostOfIndiscipline, CostResult } from '@/lib/cost-of-indiscipline';
import { computeDisciplineStreak } from '@/lib/discipline-streak';
import { dangerZoneSummary, findDangerZonePattern, DangerZonePattern } from '@/lib/danger-zone';
import { markDashboardSeen, requestNotificationPermissionIfEligible, syncEveningNotification } from '@/lib/notification-manager';
import { formatHoursLeft, getProStatus } from '@/lib/tier';
import { RULE_TEMPLATES } from '@/lib/trading-rules';
import { supabase } from '@/lib/supabase';

type ScoreSnapshot = {
  score: number;
  period_start: string;
  period_end: string;
};

type OpenExec = {
  symbol: string;
  direction: 'buy' | 'sell';
  lot_size: number;
  actual_entry: number;
  entry_time: string;
};

type DashboardData = {
  latestScore: ScoreSnapshot | null;
  prevScore: ScoreSnapshot | null;
  rules: { rule_type: string; base_value: number; unit: string | null }[];
  openExecs: OpenExec[];
  dangerZone: DangerZonePattern | null;
  costResult: CostResult | null;
  streak: number;
};

export default function TodayDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, signOut, onboarding, tier, subscriptionExpiresAt } = useAuth();
  const pro = getProStatus(tier, subscriptionExpiresAt);

  // In-app Guidance: refs cho element target của tour user mới (Quick Plan + Journal)
  const { registerTarget, startTour, isTourActive } = useGuidance();
  const quickPlanRef = registerTarget('dashboard.quickPlan');
  const journalRef = registerTarget('dashboard.journal');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: profile }, { data: snapshots }, { data: rules }, { data: open }, { data: closed }, { data: violations }, { data: closedFull }, { data: deltas }, { data: plans }] =
        await Promise.all([
          supabase
            .from('user_profiles')
            .select('timezone')
            .eq('id', user.id)
            .maybeSingle(),
          supabase
            .from('discipline_score_snapshots')
            .select('score, period_start, period_end')
            .eq('user_id', user.id)
            .order('computed_at', { ascending: false })
            .limit(2),
          supabase
            .from('trading_rules')
            .select('rule_type, base_value, unit')
            .eq('user_id', user.id)
            .eq('is_active', true),
          supabase
            .from('trade_executions')
            .select('symbol, direction, lot_size, actual_entry, entry_time')
            .eq('user_id', user.id)
            .is('exit_time', null),
          supabase
            .from('trade_executions')
            .select('id, entry_time')
            .eq('user_id', user.id)
            .not('exit_time', 'is', null),
          supabase
            .from('rule_violations')
            .select('trade_execution_id, is_negative'),
          supabase
            .from('trade_executions')
            .select('id, symbol, direction, lot_size, pnl_amount, trade_plan_id, entry_time')
            .eq('user_id', user.id)
            .not('exit_time', 'is', null),
          supabase.from('plan_vs_reality_deltas').select('trade_execution_id, followed_plan'),
          supabase
            .from('trade_plans')
            .select('id, planned_entry, planned_sl, planned_tp'),
        ]);

      const snapList = (snapshots ?? []) as ScoreSnapshot[];
      const rulesList = (rules ?? []) as { rule_type: string; base_value: number; unit: string | null }[];
      const openList = (open ?? []) as OpenExec[];
      const closedList = (closed ?? []) as { id: string; entry_time: string }[];

      // ---- Danger zone: cần lệnh ĐÃ ĐÓNG (≥30) + violation gắn lệnh đóng ----
      // Module 6: giờ pattern tính theo user_profiles.timezone (fallback device-local)
      const userTimezone = (profile?.timezone as string | undefined) ?? undefined;
      let dangerZone: DangerZonePattern | null = null;
      if (closedList.length >= 30) {
        const violList = (violations ?? []) as {
          trade_execution_id: string | null;
          is_negative: boolean;
        }[];
        dangerZone = findDangerZonePattern(
          {
            closedExecutions: closedList,
            violations: violList,
          },
          userTimezone,
        );
      }

      // ---- Cost of Indiscipline (Module 4) — công thức spec, ngưỡng 30/3 ----
      let costResult: CostResult | null = null;
      const closedFullList = (closedFull ?? []) as {
        id: string;
        symbol: string;
        direction: 'buy' | 'sell';
        lot_size: number;
        pnl_amount: number | null;
        trade_plan_id: string | null;
        entry_time: string;
      }[];
      if (closedFullList.length >= 30) {
        const deltaList = (deltas ?? []) as { trade_execution_id: string; followed_plan: boolean | null }[];
        const planList = (plans ?? []) as {
          id: string;
          planned_entry: number;
          planned_sl: number;
          planned_tp: number | null;
        }[];
        const followedByExec: Record<string, boolean> = {};
        for (const d of deltaList) {
          if (d.followed_plan != null) followedByExec[d.trade_execution_id] = d.followed_plan;
        }
        const plansById = new Map(planList.map((p) => [p.id, p]));
        const plansByExec: Record<string, { planned_entry: number; planned_sl: number; planned_tp: number | null }> = {};
        for (const e of closedFullList) {
          if (e.trade_plan_id && plansById.has(e.trade_plan_id)) {
            const p = plansById.get(e.trade_plan_id)!;
            plansByExec[e.id] = { planned_entry: p.planned_entry, planned_sl: p.planned_sl, planned_tp: p.planned_tp };
          }
        }
        costResult = computeCostOfIndiscipline({
          executions: closedFullList,
          followedByExec,
          plansByExec,
        });
      } else {
        costResult = {
          totalTrades: closedFullList.length,
          deviatedCount: 0,
          actualPnl: 0,
          hypotheticalPnl: 0,
          cost: 0,
          skippedIncomplete: 0,
          showable: false,
          hiddenReason: `Cần thêm dữ liệu để tính chỉ số này (hiện có ${closedFullList.length}/30 lệnh).`,
        };
      }

      // ---- Discipline Streak (Module 7) — Free, không gate ----
      const deltaListAll = (deltas ?? []) as { trade_execution_id: string; followed_plan: boolean | null }[];
      const followedByExecStreak: Record<string, boolean> = {};
      for (const dd of deltaListAll) {
        if (dd.followed_plan != null) followedByExecStreak[dd.trade_execution_id] = dd.followed_plan;
      }
      const violatedExecIds = new Set(
        (violations ?? [])
          .filter((v) => v.is_negative !== false && v.trade_execution_id != null)
          .map((v) => v.trade_execution_id as string),
      );
      const streak = computeDisciplineStreak({
        executions: closedFullList.map((e) => ({ id: e.id, entry_time: e.entry_time })),
        followedByExec: followedByExecStreak,
        violatedExecIds,
      }).streak;

      setData({
        latestScore: snapList[0] ?? null,
        prevScore: snapList[1] ?? null,
        rules: rulesList,
        openExecs: openList,
        dangerZone,
        costResult,
        streak,
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboard();
    // Module 8 (Retention): opt-in đúng ngữ cảnh — chỉ hỏi permission SAU lần đầu thấy Dashboard,
    // không phải ngay lúc mở app lần đầu.
    markDashboardSeen().then(() => requestNotificationPermissionIfEligible());
    // Re-sync evening review mỗi khi mở app: nếu hôm nay có lệnh đóng → schedule one-shot,
    // không có → im lặng (không spam ngày trống — AC Module 8).
    syncEveningNotification().catch(() => {});
  }, [loadDashboard]);

  // Tour chào mừng cho USER MỚI (chưa có lệnh/score — cùng điều kiện card "How to start?"):
  // hiện 1 lần duy nhất (trigger show-once trong startTour), spotlight Quick Plan → Journal.
  const isNewUser = !!data && data.latestScore == null && data.openExecs.length === 0;
  useEffect(() => {
    if (!isNewUser || isTourActive) return;
    void startTour({
      tourId: 'dashboard-welcome',
      newUsersOnly: true,
      isNewUser,
      steps: [
        {
          id: 'step1-quickPlan',
          targetKey: 'dashboard.quickPlan',
          title: t('guidance.dashboardTour.step1.title'),
          body: t('guidance.dashboardTour.step1.body'),
        },
        {
          id: 'step2-journal',
          targetKey: 'dashboard.journal',
          title: t('guidance.dashboardTour.step2.title'),
          body: t('guidance.dashboardTour.step2.body'),
          placement: 'bottom',
        },
      ],
    });
  }, [isNewUser, isTourActive, startTour, t]);

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const d = data;
  const scoreDelta =
    d?.latestScore && d?.prevScore ? d.latestScore.score - d.prevScore.score : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('dashboard.title')}</Text>
      <Text style={styles.subtitle}>
        {t('dashboard.greeting', { name: user?.email?.split('@')[0] ?? 'trader' })}
      </Text>

      {/* Nút Quick Plan nổi bật — dẫn thẳng Fast Plan (target tour user mới) */}
      <TouchableOpacity ref={quickPlanRef} style={styles.quickPlanBtn} onPress={() => router.push('/(main)/new-plan')}>
        <Text style={styles.quickPlanText}>{t('dashboard.quickPlan')}</Text>
        <Text style={styles.quickPlanSub}>{t('dashboard.quickPlanSub')}</Text>
      </TouchableOpacity>

      {/* 1. Discipline Score + delta */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Discipline Score</Text>
        {d?.latestScore ? (
          <View style={styles.scoreRow}>
            <Text style={styles.scoreValue}>{d.latestScore.score.toFixed(1)}</Text>
            {scoreDelta != null && (
              <Text style={[styles.scoreDelta, scoreDelta >= 0 ? styles.deltaPos : styles.deltaNeg]}>
                {scoreDelta >= 0 ? '▲' : '▼'} {Math.abs(scoreDelta).toFixed(1)} {t('dashboard.deltaLabel')}
              </Text>
            )}
          </View>
        ) : (
          <Text style={styles.emptyText}>{t('dashboard.noScore')}</Text>
        )}
      </View>

      {/* 2. Personal Danger Zone — 1 dòng, ẩn nếu chưa đủ ngưỡng (Module 6) */}
      {d?.dangerZone && (
        <TouchableOpacity style={[styles.card, styles.cardWarn]} onPress={() => router.push('/(main)/danger-zone')}>
          <Text style={styles.cardTitleWarn}>
            {t('dashboard.dangerZoneTitle')} {pro.isPro ? '' : `(${t('dashboard.proDetail')})`}
          </Text>
          <Text style={styles.warnText}>{dangerZoneSummary(d.dangerZone)}</Text>
          <Text style={styles.dzLink}>{t('dashboard.dzLink')}</Text>
        </TouchableOpacity>
      )}

      {/* 7. Discipline Streak — Module 7 (Free) */}
      {d && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('dashboard.streakTitle')}</Text>
          <Text style={styles.streakValue}>
            {d.streak > 0 ? t('dashboard.streakValue', { count: d.streak }) : '0'}
          </Text>
          <Text style={styles.streakNote}>
            {d.streak > 0 ? t('dashboard.streakNoteOk') : t('dashboard.streakNoteEmpty')}
          </Text>
        </View>
      )}

      {/* 3. Rules active hôm nay */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('dashboard.rulesTitle')}</Text>
        {d && d.rules.length === 0 ? (
          <Text style={styles.emptyText}>{t('dashboard.noRules')}</Text>
        ) : (
          (d?.rules ?? []).map((r) => {
            const tpl = RULE_TEMPLATES.find((t) => t.rule_type === r.rule_type);
            const label = tpl?.label ?? (r.rule_type === 'custom' ? 'Luật tùy chỉnh' : r.rule_type);
            const unitLabel =
              r.unit === 'percent' ? '%' : r.unit === 'currency' ? ' USD' : r.unit === 'minutes' ? t('dashboard.unitMinutes') : '';
            return (
              <View key={r.rule_type} style={styles.ruleRow}>
                <Text style={styles.ruleLabel}>✓ {label}</Text>
                <Text style={styles.ruleValue}>
                  {r.base_value}
                  {unitLabel}
                </Text>
              </View>
            );
          })
        )}
      </View>

      {/* 4. Cost of Indiscipline — Module 4 (Free 1 dòng + disclaimer cố định) */}
      {d?.costResult && <CostOfIndisciplineCard result={d.costResult} isPro={pro.isPro} />}

      {/* 5. Lệnh đang mở — card riêng */}
      {d && d.openExecs.length > 0 && (
        <View style={[styles.card, styles.cardOpen]}>
          <Text style={styles.cardTitle}>{t('dashboard.openTradesTitle', { count: d.openExecs.length })}</Text>
          {d.openExecs.map((e, i) => (
            <View key={i} style={styles.ruleRow}>
              <Text style={styles.ruleLabel}>
                {e.symbol} {e.direction.toUpperCase()} · {e.lot_size.toFixed(2)} lot
              </Text>
              <Text style={styles.ruleValue}>Entry {e.actual_entry}</Text>
            </View>
          ))}
          <Text style={styles.openNote}>{t('dashboard.openNote')}</Text>
          <TouchableOpacity style={styles.closeLink} onPress={() => router.push('/(main)/execution-widget')}>
            <Text style={styles.closeLinkText}>{t('dashboard.openWidgetLink')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* User mới (0 lệnh, chưa có score): hướng dẫn có nghĩa */}
      {d && d.latestScore == null && d.openExecs.length === 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('dashboard.guideTitle')}</Text>
          <Text style={styles.guideText}>
            {t('dashboard.guide1')}{'\n'}
            {t('dashboard.guide2')}{'\n'}
            {t('dashboard.guide3')}
          </Text>
          <TouchableOpacity style={styles.guideBtn} onPress={() => router.push('/(main)/execution-widget')}>
            <Text style={styles.guideBtnText}>{t('dashboard.firstTradeBtn')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Điều hướng nhanh */}
      <View style={styles.navGrid}>
        <TouchableOpacity ref={journalRef} style={styles.navBtn} onPress={() => router.push('/(main)/journal')}>
          <Text style={styles.navBtnText}>{t('dashboard.navJournal')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/(main)/paste-mt4')}>
          <Text style={styles.navBtnText}>{t('dashboard.navPasteMt4')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/(main)/scores')}>
          <Text style={styles.navBtnText}>{t('dashboard.navScores')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/(main)/weekly-audit')}>
          <Text style={styles.navBtnText}>{t('dashboard.navWeeklyAudit')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/(main)/setup-analytics')}>
          <Text style={styles.navBtnText}>{t('dashboard.navSetupAnalytics')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/(main)/danger-zone')}>
          <Text style={styles.navBtnText}>{t('dashboard.navDangerZone')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/(main)/portfolio-risk')}>
          <Text style={styles.navBtnText}>
            {t('dashboard.navPortfolioRisk')}{pro.isPro ? ' (Pro)' : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navBtn, pro.isPro ? styles.navBtnGray : styles.navBtnPro]}
          onPress={() => router.push('/(main)/pro')}
        >
          <Text style={styles.navBtnText}>
            {pro.isPro
              ? t('dashboard.navProActive', { hours: formatHoursLeft(pro.hoursLeft) })
              : t('dashboard.navPro')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/(main)/settings')}>
          <Text style={styles.navBtnText}>{t('settings.title')}</Text>
        </TouchableOpacity>
      </View>

      {onboarding && !onboarding.hasBalance && (
        <Text style={styles.hint}>{t('dashboard.balanceHint')}</Text>
      )}

      <TouchableOpacity onPress={signOut} style={styles.signOut}>
        <Text style={styles.signOutText}>{t('settings.signOut')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 13, opacity: 0.65, marginTop: 2, marginBottom: 14 },
  quickPlanBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 4,
  },
  quickPlanText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  quickPlanSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  cardWarn: { backgroundColor: '#FFF8E1', borderColor: '#F5C542' },
  cardOpen: { backgroundColor: '#F0F8FF', borderColor: '#cce5ff' },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardTitleWarn: { fontSize: 15, fontWeight: '700', color: '#8a6d3b' },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  scoreValue: { fontSize: 40, fontWeight: '800', color: '#208AEF' },
  streakValue: { fontSize: 30, fontWeight: '800', color: '#d9534f' },
  streakNote: { fontSize: 12, opacity: 0.7 },
  scoreDelta: { fontSize: 13, fontWeight: '600' },
  deltaPos: { color: '#28a745' },
  deltaNeg: { color: '#d33' },
  emptyText: { fontSize: 13, opacity: 0.65, lineHeight: 19 },
  warnText: { fontSize: 13, lineHeight: 19, color: '#8a6d3b' },
  ruleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  ruleLabel: { fontSize: 14, flex: 1 },
  ruleValue: { fontSize: 14, fontWeight: '700' },
  dzLink: { fontSize: 12, color: '#208AEF', fontWeight: '600', marginTop: 2 },
  openNote: { fontSize: 11, opacity: 0.6, lineHeight: 16, marginTop: 4 },
  closeLink: { marginTop: 4 },
  closeLinkText: { color: '#208AEF', fontSize: 13, fontWeight: '600' },
  guideText: { fontSize: 13, lineHeight: 22, opacity: 0.85 },
  guideBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  guideBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  navBtn: {
    backgroundColor: '#f0f4f8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: '47%',
    flexGrow: 1,
    alignItems: 'center',
  },
  navBtnGray: { backgroundColor: '#6c757d' },
  navBtnPro: { backgroundColor: '#B8860B' },
  navBtnText: { fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 12, opacity: 0.6, marginTop: 12, textAlign: 'center' },
  signOut: { marginTop: 14, alignItems: 'center' },
  signOutText: { color: '#d33', fontSize: 14 },
});
