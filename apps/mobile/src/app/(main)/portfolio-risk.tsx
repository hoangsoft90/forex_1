import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/lib/auth-context';
import {
  computePortfolioRisk,
  correlationMatrix,
  OpenPosition,
} from '@/lib/portfolio-risk';
import { supabase } from '@/lib/supabase';
import { getProStatus } from '@/lib/tier';

export default function PortfolioRiskScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, tier, subscriptionExpiresAt } = useAuth();
  const pro = getProStatus(tier, subscriptionExpiresAt);

  const [loading, setLoading] = useState(true);
  const [totalRisk, setTotalRisk] = useState<ReturnType<typeof computePortfolioRisk> | null>(null);
  const [corrPairs, setCorrPairs] = useState<{ a: string; b: string; value: number }[]>([]);
  const [symbols, setSymbols] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [profileRes, rulesRes, openRes] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('account_balance_baseline')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('trading_rules')
        .select('rule_type, base_value')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .in('rule_type', ['max_risk_per_trade', 'max_daily_loss']),
      supabase
        .from('trade_executions')
        .select('symbol, direction, lot_size, actual_risk_percent')
        .eq('user_id', user.id)
        .is('exit_time', null),
    ]);

    const balance = profileRes.data?.account_balance_baseline ?? 0;
    const maxRisk = rulesRes.data?.find((r) => r.rule_type === 'max_risk_per_trade')?.base_value ?? 1;
    const maxDaily = rulesRes.data?.find((r) => r.rule_type === 'max_daily_loss')?.base_value ?? 3;

    const open = (openRes.data ?? []) as { symbol: string; direction: 'buy' | 'sell'; lot_size: number; actual_risk_percent: number | null }[];
    const positions: OpenPosition[] = open.map((e) => ({
      symbol: e.symbol,
      direction: e.direction,
      lotSize: e.lot_size,
      riskPercent: e.actual_risk_percent,
      balance,
    }));

    // Dùng biến local (không đưa `symbols` vào deps) — setSymbols với mảng mới
    // mỗi lần sẽ làm `load` đổi identity → useEffect chạy lại → VÒNG LẶP VÔ HẠN.
    const uniqueSymbols = [...new Set(open.map((e) => e.symbol))];
    setSymbols(uniqueSymbols);
    setTotalRisk(computePortfolioRisk(positions, { maxRiskPerTrade: maxRisk, maxDailyLoss: maxDaily }));
    setCorrPairs(correlationMatrix(uniqueSymbols));
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

  if (!totalRisk) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>{t('portfolioRisk.noData')}</Text>
      </View>
    );
  }

  const levelColor =
    totalRisk.level === 'danger' ? '#d33' : totalRisk.level === 'warn' ? '#b8860b' : '#28a745';
  const levelText =
    totalRisk.level === 'danger'
      ? t('portfolioRisk.levelDanger', {
          total: totalRisk.totalRiskPercent.toFixed(1),
          threshold: totalRisk.thresholdPercent.toFixed(1),
        })
      : totalRisk.level === 'warn'
        ? t('portfolioRisk.levelWarn', {
            total: totalRisk.totalRiskPercent.toFixed(1),
            threshold: totalRisk.thresholdPercent.toFixed(1),
          })
        : t('portfolioRisk.levelOk', {
            total: totalRisk.totalRiskPercent.toFixed(1),
            threshold: totalRisk.thresholdPercent.toFixed(1),
          });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('portfolioRisk.title')}</Text>
      <Text style={styles.subtitle}>{t('portfolioRisk.subtitle')}</Text>

      <View style={[styles.totalBox, { borderColor: levelColor }]}>
        <Text style={[styles.totalText, { color: levelColor }]}>{levelText}</Text>
        <Text style={styles.detail}>
          {t('portfolioRisk.detail', {
            count: totalRisk.positions.length,
            threshold: totalRisk.thresholdPercent.toFixed(1),
          })}
        </Text>
      </View>

      {totalRisk.positions.length === 0 ? (
        <Text style={styles.emptyText}>{t('portfolioRisk.noPositions')}</Text>
      ) : (
        <View style={styles.posList}>
          {totalRisk.positions.map((p, i) => (
            <View key={i} style={styles.posRow}>
              <View style={styles.posLeft}>
                <Text style={styles.posSymbol}>{p.symbol}</Text>
                <Text style={styles.posDir}>
                  {p.direction.toUpperCase()} · {p.lotSize.toFixed(2)} lot
                </Text>
              </View>
              <Text style={styles.posRisk}>
                {p.riskPercentEffective.toFixed(2)}%
                {p.riskPercent == null ? ` (${t('portfolioRisk.estimated')})` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Tier gating: correlation chỉ Pro */}
      {!pro.isPro ? (
        <View style={styles.proGate}>
          <Text style={styles.proGateTitle}>{t('portfolioRisk.proGateTitle')}</Text>
          <Text style={styles.proGateText}>{t('portfolioRisk.proGateText')}</Text>
          <TouchableOpacity style={styles.proBtn} onPress={() => router.push('/(main)/pro')}>
            <Text style={styles.proBtnText}>{t('portfolioRisk.proBtn')} →</Text>
          </TouchableOpacity>
        </View>
      ) : corrPairs.length > 0 ? (
        <View style={styles.corrBox}>
          <Text style={styles.corrTitle}>{t('portfolioRisk.corrTitle')}</Text>
          {corrPairs.map((p, i) => (
            <View key={i} style={styles.corrRow}>
              <Text style={styles.corrPair}>
                {p.a} ↔ {p.b}
              </Text>
              <Text
                style={[
                  styles.corrValue,
                  p.value >= 0.3 ? styles.corrHigh : p.value <= -0.15 ? styles.corrNeg : styles.corrMid,
                ]}
              >
                {p.value >= 0 ? '+' : ''}
                {p.value.toFixed(2)}
              </Text>
            </View>
          ))}
          <Text style={styles.corrNote}>{t('portfolioRisk.corrNote')}</Text>
        </View>
      ) : (
        <Text style={styles.emptyText}>{t('portfolioRisk.needTwoSymbols')}</Text>
      )}

      {symbols.length === 0 && (
        <Text style={styles.hint}>
          {t('portfolioRisk.currentSymbols', { symbols: symbols.join(', ') || '—' })}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 48, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { opacity: 0.6 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 13, opacity: 0.7, textAlign: 'center', lineHeight: 19 },
  totalBox: {
    borderWidth: 2,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  totalText: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  detail: { fontSize: 13, opacity: 0.7 },
  emptyText: { fontSize: 13, opacity: 0.7, textAlign: 'center', marginTop: 8 },
  posList: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, overflow: 'hidden' },
  posRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  posLeft: { gap: 2 },
  posSymbol: { fontSize: 15, fontWeight: '700' },
  posDir: { fontSize: 12, opacity: 0.6 },
  posRisk: { fontSize: 14, fontWeight: '700' },
  proGate: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#F5C542',
    borderRadius: 10,
    padding: 16,
    gap: 8,
  },
  proGateTitle: { fontSize: 15, fontWeight: '700', color: '#B8860B' },
  proGateText: { fontSize: 13, lineHeight: 19 },
  proBtn: {
    backgroundColor: '#B8860B',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  proBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  corrBox: { backgroundColor: '#F0F6FF', borderRadius: 10, padding: 16, gap: 8 },
  corrTitle: { fontSize: 14, fontWeight: '700', color: '#208AEF' },
  corrRow: { flexDirection: 'row', justifyContent: 'space-between' },
  corrPair: { fontSize: 14 },
  corrValue: { fontSize: 14, fontWeight: '700' },
  corrHigh: { color: '#d33' },
  corrNeg: { color: '#208AEF' },
  corrMid: { color: '#666' },
  corrNote: { fontSize: 11, opacity: 0.6, lineHeight: 16 },
  hint: { fontSize: 12, opacity: 0.5 },
});
