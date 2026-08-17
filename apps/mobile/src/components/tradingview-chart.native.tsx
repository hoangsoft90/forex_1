/**
 * tradingview-chart.tsx — TradingView Widget nhúng qua WebView (Phase 2, Module P2-M2).
 *
 * Đúng gợi ý mvp_scope mục 0: "dùng TradingView Widget nhúng nếu cần hiển thị giá,
 * không tự vẽ". Chỉ cần network để load widget; nếu fail → placeholder, không crash.
 */

import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

/** Map symbol app → symbol TradingView (Forex: thêm hậu tố chuẩn). */
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
  const html = useMemo(() => {
    const tv = tvSymbol(symbol);
    // TradingView advanced chart widget — embed script chuẩn (v3).
    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  html, body { margin: 0; padding: 0; background: #fff; }
  #tv-wrap { width: 100%; height: 100%; }
</style>
</head>
<body>
<div id="tv-wrap">
  <!-- TradingView Widget BEGIN -->
  <div class="tradingview-widget-container" style="width:100%;height:100%">
    <div id="tradingview_placeholder" style="width:100%;height:100%"></div>
    <script type="text/javascript" src="https://s3.tradingview.com/tv.js"></script>
    <script type="text/javascript">
      window.addEventListener('load', function () {
        try {
          if (typeof TradingView === 'undefined') {
            document.getElementById('tradingview_placeholder').innerHTML =
              '<p style="padding:20px;font-family:sans-serif;color:#888">Không tải được TradingView — kiểm tra kết nối mạng.</p>';
            return;
          }
          new TradingView.widget({
            container_id: 'tradingview_placeholder',
            autosize: true,
            symbol: '${tv}',
            interval: '15',
            timezone: 'Asia/Ho_Chi_Minh',
            theme: 'light',
            style: '1',
            locale: 'vi_VN',
            toolbar_bg: '#f1f3f6',
            enable_publishing: false,
            allow_symbol_change: false,
            hide_side_toolbar: false,
            studies: [],
          });
        } catch (e) {
          document.getElementById('tradingview_placeholder').innerHTML =
            '<p style="padding:20px;font-family:sans-serif;color:#888">Lỗi tải chart: ' + e.message + '</p>';
        }
      });
    </script>
  </div>
  <!-- TradingView Widget END -->
</div>
</body>
</html>`;
  }, [symbol]);

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        source={{ html }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        style={styles.webview}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Đang tải chart {symbol}…</Text>
          </View>
        )}
        renderError={() => (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              Không tải được chart — kiểm tra kết nối mạng.
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e5e5' },
  webview: { flex: 1, backgroundColor: '#fff' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f8f8' },
  placeholderText: { fontSize: 13, color: '#888', textAlign: 'center', padding: 16 },
});
