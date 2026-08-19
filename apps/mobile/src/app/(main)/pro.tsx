import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  formatCooldown,
  getLastRewardedAt,
  getRemainingCooldownMs,
} from '@/lib/ad-cooldown';
import { useAuth } from '@/lib/auth-context';
import { isAdmobConfigured } from '@/lib/admob';
import {
  computeCostOfIndiscipline,
  CostResult,
  deviatedTradesBreakdown,
  DeviatedTradeRow,
} from '@/lib/cost-of-indiscipline';
import { safeBack } from '@/lib/navigation';
import { unlockProViaAd } from '@/lib/pro-unlock';
import { formatHoursLeft, getProStatus } from '@/lib/tier';
import { supabase } from '@/lib/supabase';

export default function ProScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, tier, subscriptionExpiresAt, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Module 4 Pro: breakdown cost_of_indiscipline (chỉ Pro — gating đúng spec)
  const [cost, setCost] = useState<{ result: CostResult; rows: DeviatedTradeRow[] } | null>(null);
  const [costLoading, setCostLoading] = useState(false);
  // Cooldown: số ms còn phải chờ trước khi xem ad tiếp theo (0 = sẵn sàng).
  const [cooldownMs, setCooldownMs] = useState(0);

  // Load cooldown lúc mở màn hình + đồng hồ đếm ngược mỗi giây.
  useEffect(() => {
    let mounted = true;
    getLastRewardedAt().then((last) => {
      if (mounted) setCooldownMs(getRemainingCooldownMs(last));
    });
    const timer = setInterval(() => {
      getLastRewardedAt().then((last) => {
        if (mounted) setCooldownMs(getRemainingCooldownMs(last));
      });
    }, 1000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const status = getProStatus(tier, subscriptionExpiresAt);
  const admobReady = isAdmobConfigured();
  const cooldownActive = cooldownMs > 0;

  // Load cost breakdown khi Pro (Free: tóm tắt 1 dòng đã có ở Dashboard).
  useEffect(() => {
    if (!status.isPro || !user) return;
    let mounted = true;
    // Fetch-on-mount: setState xảy ra sau await (async) — không phải synchronous trong effect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCostLoading(true);
    (async () => {
      const [{ data: closedFull }, { data: deltas }, { data: plans }] = await Promise.all([
        supabase
          .from('trade_executions')
          .select('id, symbol, direction, lot_size, pnl_amount, trade_plan_id')
          .eq('user_id', user.id)
          .not('exit_time', 'is', null),
        supabase.from('plan_vs_reality_deltas').select('trade_execution_id, followed_plan'),
        supabase.from('trade_plans').select('id, planned_entry, planned_sl, planned_tp'),
      ]);
      const execList = (closedFull ?? []) as {
        id: string;
        symbol: string;
        direction: 'buy' | 'sell';
        lot_size: number;
        pnl_amount: number | null;
        trade_plan_id: string | null;
      }[];
      const followedByExec: Record<string, boolean> = {};
      for (const d of deltas ?? []) {
        if (d.followed_plan != null) followedByExec[d.trade_execution_id] = d.followed_plan;
      }
      const plansById = new Map((plans ?? []).map((p) => [p.id, p]));
      const plansByExec: Record<string, { planned_entry: number; planned_sl: number; planned_tp: number | null }> = {};
      for (const e of execList) {
        if (e.trade_plan_id && plansById.has(e.trade_plan_id)) {
          const p = plansById.get(e.trade_plan_id)!;
          plansByExec[e.id] = { planned_entry: p.planned_entry, planned_sl: p.planned_sl, planned_tp: p.planned_tp };
        }
      }
      const input = { executions: execList, followedByExec, plansByExec };
      const result = computeCostOfIndiscipline(input);
      const rows = deviatedTradesBreakdown(input);
      if (mounted) setCost({ result, rows });
    })().finally(() => {
      if (mounted) setCostLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [status.isPro, user]);

  async function handleWatchAd() {
    setLoading(true);
    setMessage(null);
    const result = await unlockProViaAd();
    setLoading(false);
    if (result.ok) {
      setMessage(
        t('pro.unlocked', { until: new Date(result.expiresAt).toLocaleString() }),
      );
      await refreshProfile();
    } else {
      setMessage(result.reason);
    }
    // Cập nhật lại cooldown ngay sau khi xem (thành công hoặc bị chặn).
    const last = await getLastRewardedAt();
    setCooldownMs(getRemainingCooldownMs(last));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('pro.title')}</Text>

      {status.isPro ? (
        <View style={styles.proCard}>
          <Text style={styles.proBadge}>{t('pro.youArePro')}</Text>
          <Text style={styles.proText}>
            {t('pro.hoursLeft', { hours: formatHoursLeft(status.hoursLeft) })}
          </Text>
        </View>
      ) : (
        <View style={styles.freeCard}>
          <Text style={styles.proBadgeMuted}>{t('pro.youAreFree')}</Text>
          <Text style={styles.proText}>{t('pro.freeText')}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, (loading || !admobReady || cooldownActive) && styles.buttonDisabled]}
        onPress={handleWatchAd}
        disabled={loading || !admobReady || cooldownActive}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : cooldownActive ? (
          <Text style={styles.buttonText}>
            ⏳ {t('pro.cooldown', { time: formatCooldown(cooldownMs) })}
          </Text>
        ) : (
          <Text style={styles.buttonText}>
            {admobReady ? t('pro.watchAd') : t('pro.adNotConfigured')}
          </Text>
        )}
      </TouchableOpacity>

      {cooldownActive ? (
        <Text style={styles.hint}>{t('pro.cooldownHint', { time: formatCooldown(cooldownMs) })}</Text>
      ) : null}

      {!admobReady ? (
        <Text style={styles.hint}>{t('pro.admobHint')}</Text>
      ) : null}

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {/* ---- Module 4: Cost of Indiscipline breakdown (Pro) ---- */}
      {status.isPro && costLoading && <ActivityIndicator style={{ marginTop: 8 }} />}
      {status.isPro && !costLoading && cost && cost.result.showable && (
        <View style={styles.costCard}>
          <Text style={styles.costTitle}>{t('costCard.title')}</Text>
          <Text style={styles.costValue}>
            {cost.result.cost >= 0 ? '−' : '+'}${Math.abs(cost.result.cost).toFixed(2)}
          </Text>
          {cost.rows.map((r) => (
            <View key={r.execId} style={styles.costRow}>
              <Text style={styles.costRowSymbol}>
                {r.symbol} {r.direction.toUpperCase()}
              </Text>
              <Text style={styles.costRowPnl}>
                {r.hypotheticalPnl != null
                  ? t('costCard.proRow', {
                      actual: r.actualPnl.toFixed(2),
                      hypo: r.hypotheticalPnl.toFixed(2),
                    })
                  : t('costCard.proRowMissing')}
              </Text>
            </View>
          ))}
          {/* Disclaimer CỐ ĐỊNH — bắt buộc ở mọi nơi hiển thị con số (AC Module 4) */}
          <Text style={styles.disclaimer}>{t('costCard.disclaimer')}</Text>
        </View>
      )}
      {status.isPro && !costLoading && cost && !cost.result.showable && (
        <View style={styles.costCard}>
          <Text style={styles.costTitle}>{t('costCard.title')}</Text>
          <Text style={styles.costHidden}>{cost.result.hiddenReason}</Text>
        </View>
      )}

      <TouchableOpacity onPress={() => safeBack(router, '/(main)')} style={styles.back}>
        <Text style={styles.backText}>‹ {t('pro.back')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 14 },
  title: { fontSize: 24, fontWeight: '700' },
  proCard: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#F5C542',
    borderRadius: 10,
    padding: 16,
    gap: 8,
  },
  freeCard: {
    backgroundColor: '#F1F3F5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 16,
    gap: 8,
  },
  proBadge: { color: '#B8860B', fontWeight: '700', fontSize: 13 },
  proBadgeMuted: { color: '#666', fontWeight: '700', fontSize: 13 },
  proText: { fontSize: 14, lineHeight: 20 },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  hint: { fontSize: 12, color: '#888', lineHeight: 17 },
  message: { fontSize: 14, color: '#333', lineHeight: 20 },
  costCard: {
    backgroundColor: '#FDF3F3',
    borderWidth: 1,
    borderColor: '#f0c9c9',
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  costTitle: { fontSize: 15, fontWeight: '700' },
  costValue: { fontSize: 26, fontWeight: '800', color: '#d9534f' },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  costRowSymbol: { fontSize: 13, fontWeight: '600' },
  costRowPnl: { fontSize: 13, opacity: 0.85 },
  costHidden: { fontSize: 13, opacity: 0.7 },
  disclaimer: { fontSize: 11, opacity: 0.7, lineHeight: 16, marginTop: 6, fontStyle: 'italic' },
  back: { marginTop: 12, alignSelf: 'flex-start' },
  backText: { color: '#208AEF', fontSize: 15 },
});
