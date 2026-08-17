/**
 * tradingview-chart.tsx — WEB STUB của TradingView chart.
 *
 * Bản native dùng `react-native-webview` (native-only) nằm ở
 * `tradingview-chart.native.tsx` — Metro tự chọn theo platform.
 * Trên web, nhúng iframe TradingView thật (web vẫn hiển thị chart).
 */

import { createElement, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/** Map symbol app → symbol TradingView (giữ đồng bộ với bản native). */
export function tvSymbol(symbol: string): string {
  switch (symbol) {
    case 'EURUSD':
      return 'FX:EURUSD';
    case 'XAUUSD':
      return 'OANDA:XAUUSD';
    case 'USDJPY':
      return 'FX:USDJPY';
    default:
      return `FX:${symbol}`;
  }
}

type Props = {
  symbol: string;
  height?: number;
};

export default function TradingViewChart({ symbol, height = 280 }: Props) {
  const src = useMemo(() => {
    const tv = tvSymbol(symbol);
    const params = new URLSearchParams({
      symbol: tv,
      interval: '15',
      theme: 'light',
      style: '1',
      locale: 'vi_VN',
      hide_side_toolbar: '0',
      allow_symbol_change: '0',
      autosize: '1',
    });
    return `https://s.tradingview.com/widgetembed/?frameElementId=tradingview&${params.toString()}`;
  }, [symbol]);

  return (
    <View style={[styles.wrap, { height }]}>
      {createElement('iframe', {
        src,
        style: { width: '100%', height: '100%', border: 'none' },
        title: `TradingView ${symbol}`,
      })}
      <Text style={styles.fallback}>
        Chart không tải được? Kiểm tra kết nối mạng.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e5e5' },
  fallback: { fontSize: 11, color: '#999', textAlign: 'center', padding: 8 },
});
