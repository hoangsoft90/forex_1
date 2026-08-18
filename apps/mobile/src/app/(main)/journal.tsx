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

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

type JournalRow = {
  id: string;
  symbol: string;
  direction: 'buy' | 'sell';
  lot_size: number;
  actual_entry: number;
  exit_price: number | null;
  entry_time: string;
  exit_time: string | null;
  pnl_amount: number | null;
  trade_plan_id: string | null;
  followed_plan: boolean | null;
};

type Insight = { followedGood: number; followedTotal: number; deviatedGood: number; deviatedTotal: number } | null;

export default function JournalScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [rows, setRows] = useState<JournalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<Insight>(null);

  const loadJournal = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('trade_executions')
      .select(
        'id, symbol, direction, lot_size, actual_entry, exit_price, entry_time, exit_time, pnl_amount, trade_plan_id',
      )
      .eq('user_id', user.id)
      .order('entry_time', { ascending: false })
      .limit(100);
    const list = (data ?? []) as JournalRow[];

    // Gắn followed_plan từ delta (chỉ lệnh có plan)
    const withPlan = list.filter((r) => r.trade_plan_id);
    let followedMap: Record<string, boolean> = {};
    if (withPlan.length > 0) {
      const { data: deltas } = await supabase
        .from('plan_vs_reality_deltas')
        .select('trade_execution_id, followed_plan')
        .in(
          'trade_execution_id',
          withPlan.map((r) => r.id),
        );
      for (const d of deltas ?? []) followedMap[d.trade_execution_id] = d.followed_plan;
    }
    setRows(list.map((r) => ({ ...r, followed_plan: r.trade_plan_id ? followedMap[r.id] ?? null : null })));

    // Insight: "X% lệnh theo plan tốt hơn Y% lệch plan" (ẩn nếu < 10 lệnh)
    const closed = list.filter((r) => r.exit_time && r.pnl_amount != null && r.trade_plan_id);
    const withDelta = closed.filter((r) => followedMap[r.id] != null);
    if (withDelta.length >= 10) {
      const followed = withDelta.filter((r) => followedMap[r.id]);
      const deviated = withDelta.filter((r) => !followedMap[r.id]);
      setInsight({
        followedGood: followed.filter((r) => (r.pnl_amount ?? 0) > 0).length,
        followedTotal: followed.length,
        deviatedGood: deviated.filter((r) => (r.pnl_amount ?? 0) > 0).length,
        deviatedTotal: deviated.length,
      });
    } else {
      setInsight(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadJournal();
  }, [loadJournal]);

  function fmt(n: number | null | undefined, digits = 2): string {
    if (n == null) return '—';
    return n.toFixed(digits);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('journal.title')}</Text>

      {insight && insight.followedTotal > 0 && insight.deviatedTotal > 0 && (
        <View style={styles.insightBox}>
          <Text style={styles.insightTitle}>{t('journal.insightTitle')}</Text>
          <Text style={styles.insightText}>
            {t('journal.insightText', {
              followedPct: Math.round((insight.followedGood / insight.followedTotal) * 100),
              deviatedPct: Math.round((insight.deviatedGood / insight.deviatedTotal) * 100),
            })}
          </Text>
        </View>
      )}
      {!insight && <Text style={styles.hint}>{t('journal.insightHint')}</Text>}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : rows.length === 0 ? (
        <Text style={styles.empty}>{t('journal.empty')}</Text>
      ) : (
        rows.map((r) => (
          <TouchableOpacity
            key={r.id}
            style={styles.row}
            onPress={() => router.push({ pathname: '/(main)/trade-detail', params: { id: r.id } })}
          >
            <View style={styles.rowHeader}>
              <Text style={styles.rowSymbol}>
                {r.symbol} {r.direction.toUpperCase()}
              </Text>
              {r.followed_plan != null && (
                <Text style={[styles.badge, r.followed_plan ? styles.badgeOk : styles.badgeBad]}>
                  {r.followed_plan ? t('journal.followed') : t('journal.deviated')}
                </Text>
              )}
            </View>
            <Text style={styles.rowMeta}>
              {r.lot_size.toFixed(2)} lot · Entry {fmt(r.actual_entry, r.symbol === 'USDJPY' ? 3 : 5)} ·{' '}
              {r.exit_time
                ? t('journal.closed', { time: new Date(r.exit_time).toLocaleString() })
                : t('journal.open')}
            </Text>
            <Text style={[styles.rowPnl, (r.pnl_amount ?? 0) >= 0 ? styles.pnlPos : styles.pnlNeg]}>
              {r.pnl_amount != null ? `$${r.pnl_amount >= 0 ? '+' : ''}${fmt(r.pnl_amount)}` : '—'}
            </Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  insightBox: {
    backgroundColor: '#EAF3FF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    gap: 4,
  },
  insightTitle: { fontSize: 13, fontWeight: '700', color: '#208AEF' },
  insightText: { fontSize: 14, lineHeight: 21 },
  hint: { fontSize: 12, opacity: 0.6, textAlign: 'center', marginBottom: 12 },
  empty: { textAlign: 'center', opacity: 0.6, marginTop: 24 },
  row: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    gap: 4,
  },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowSymbol: { fontSize: 15, fontWeight: '700' },
  badge: { fontSize: 12, fontWeight: '700', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden' },
  badgeOk: { backgroundColor: '#d4edda', color: '#155724' },
  badgeBad: { backgroundColor: '#f8d7da', color: '#721c24' },
  rowMeta: { fontSize: 12, opacity: 0.7 },
  rowPnl: { fontSize: 15, fontWeight: '700' },
  pnlPos: { color: '#28a745' },
  pnlNeg: { color: '#d33' },
});
