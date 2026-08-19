import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/lib/auth-context';
import {
  dangerZoneSummary,
  DangerZoneDetail,
  findDangerZoneDetail,
  hourInZone,
  nthOrderSummary,
} from '@/lib/danger-zone';
import { supabase } from '@/lib/supabase';

type HourBar = { hour: number; count: number };

/**
 * Personal Danger Zone — Module 6 (P1).
 * Màn chi tiết (Pro): nhiều pattern + biểu đồ phân bố vi phạm theo giờ.
 * Ngưỡng bất biến: ≥30 lệnh đóng VÀ pattern ≥5 lần — không hiện kết luận dưới ngưỡng.
 * Free: xem 1 dòng tóm tắt ở Today Dashboard (đã có ở Module 2).
 */
export default function DangerZoneScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [detail, setDetail] = useState<DangerZoneDetail | null>(null);
  const [hourBars, setHourBars] = useState<HourBar[]>([]);
  const [totalClosed, setTotalClosed] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: profile }, { data: closed }, { data: violations }] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('timezone')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('trade_executions')
        .select('id, entry_time')
        .eq('user_id', user.id)
        .not('exit_time', 'is', null),
      supabase.from('rule_violations').select('trade_execution_id, is_negative'),
    ]);
    // Module 6: tính giờ pattern theo timezone user (IANA), fallback device-local nếu null
    const timezone = (profile?.timezone as string | undefined) ?? undefined;

    const closedList = (closed ?? []) as { id: string; entry_time: string }[];
    const violList = (violations ?? []) as {
      trade_execution_id: string | null;
      is_negative: boolean;
    }[];
    setTotalClosed(closedList.length);

    const d = findDangerZoneDetail({ closedExecutions: closedList, violations: violList }, timezone);
    setDetail(d);

    // Biểu đồ vi phạm theo giờ (tất cả giờ, không cần đủ ngưỡng — chỉ là phân bố)
    const execById = new Map(closedList.map((e) => [e.id, e]));
    const bars: Record<number, number> = {};
    for (const v of violList) {
      if (v.is_negative === false) continue;
      if (!v.trade_execution_id) continue;
      const exec = execById.get(v.trade_execution_id);
      if (!exec) continue;
      const h = hourInZone(exec.entry_time, timezone);
      bars[h] = (bars[h] ?? 0) + 1;
    }
    setHourBars(
      Object.entries(bars)
        .map(([h, count]) => ({ hour: Number(h), count }))
        .sort((a, b) => b.count - a.count),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const hasAnyPattern = detail?.hourPattern != null || detail?.nthOrderPattern != null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('dangerZone.title')}</Text>
      <Text style={styles.subtitle}>{t('dangerZone.subtitle')}</Text>

      {totalClosed < 30 ? (
        <View style={styles.progressBox}>
          <Text style={styles.progressText}>{t('dangerZone.notEnoughTrades', { count: totalClosed })}</Text>
        </View>
      ) : !hasAnyPattern ? (
        <View style={styles.progressBox}>
          <Text style={styles.progressText}>{t('dangerZone.noPattern', { count: totalClosed })}</Text>
        </View>
      ) : (
        <>
          {detail?.hourPattern && (
            <View style={styles.patternCard}>
              <Text style={styles.patternText}>{dangerZoneSummary(detail.hourPattern)}</Text>
            </View>
          )}
          {detail?.nthOrderPattern && (
            <View style={styles.patternCard}>
              <Text style={styles.patternText}>{nthOrderSummary(detail.nthOrderPattern)}</Text>
            </View>
          )}
        </>
      )}

      {/* Biểu đồ phân bố vi phạm theo giờ — chỉ hiện khi đủ ngưỡng 30 lệnh
          (tránh gây hiểu lầm như "kết luận" từ dữ liệu ít — đúng tinh thần AC M6) */}
      {totalClosed >= 30 && (
        <>
          <Text style={styles.chartTitle}>{t('dangerZone.chartTitle')}</Text>
          {hourBars.length === 0 ? (
            <Text style={styles.emptyNote}>{t('dangerZone.noViolations')}</Text>
          ) : (
            <View style={styles.chartBox}>
              {hourBars.slice(0, 8).map((b) => {
                const max = hourBars[0].count || 1;
                const pct = Math.max(8, Math.round((b.count / max) * 100));
                return (
                  <View key={b.hour} style={styles.barRow}>
                    <Text style={styles.barLabel}>{b.hour}:00</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={styles.barCount}>{b.count}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      <Text style={styles.note}>{t('dangerZone.tierNote')}</Text>
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
  patternCard: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#F5C542',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  patternText: { fontSize: 14, lineHeight: 21, color: '#8a6d3b' },
  chartTitle: { fontSize: 15, fontWeight: '700', marginTop: 14, marginBottom: 8 },
  chartBox: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { fontSize: 12, width: 40 },
  barTrack: { flex: 1, height: 12, backgroundColor: '#f0f0f0', borderRadius: 6, overflow: 'hidden' },
  barFill: { height: 12, backgroundColor: '#d9534f', borderRadius: 6 },
  barCount: { fontSize: 12, fontWeight: '600', width: 24, textAlign: 'right' },
  emptyNote: { fontSize: 13, opacity: 0.6 },
  note: {
    fontSize: 12,
    color: '#6c757d',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    marginTop: 14,
    lineHeight: 18,
  },
});
