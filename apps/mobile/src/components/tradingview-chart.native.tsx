/**
 * tradingview-chart.tsx — TradingView Widget nhúng qua WebView (Phase 2, Module P2-M2).
 *
 * Đúng gợi ý mvp_scope mục 0: "dùng TradingView Widget nhúng nếu cần hiển thị giá,
 * không tự vẽ". Chỉ cần network để load widget; nếu fail → placeholder, không crash.
 */

import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
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

export default function TradingViewChart({ symbol, height = 360 }: Props) {
  const { t, i18n } = useTranslation();
  const tvLocale = i18n.resolvedLanguage?.startsWith('vi') ? 'vi_VN' : 'en';
  const html = useMemo(() => {
    const tv = tvSymbol(symbol);
    const loadFailMsg = t('chart.webLoadFail');
    // TradingView iframe embed — ổn định hơn JS widget trên Android WebView
    // (tránh lỗi load event timing + script S3).
    // Dùng px cụ thể (không dùng %) để Android WebView render đúng kích thước.
    const iframeSrc = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview&symbol=${encodeURIComponent(tv)}&interval=15&timezone=Asia%2FHo_Chi_Minh&theme=light&style=1&locale=${tvLocale}&hide_side_toolbar=0&allow_symbol_change=0&autosize=1`;
    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  html, body { margin: 0; padding: 0; background: #fff; overflow: hidden; height: ${height}px; }
  #tv-wrap { position: relative; width: 100%; height: ${height}px; }
  iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
  .error-msg { padding: 20px; font-family: sans-serif; color: #888; text-align: center; }
</style>
</head>
<body>
  <div id="tv-wrap">
    <iframe
      src="${iframeSrc}"
      title="TradingView ${tv}"
      allowfullscreen
      onload="document.getElementById('tv-loading').style.display='none'"
      onerror="document.getElementById('tv-loading').innerHTML='<p class=\\'error-msg\\'>${loadFailMsg}</p>'"
    ></iframe>
    <div id="tv-loading" style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;background:#f8f8f8;z-index:1">
      <p class="error-msg">${t('chart.loading', { symbol })}</p>
    </div>
  </div>
</body>
</html>`;
  }, [symbol, t, tvLocale, height]);

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
            <Text style={styles.placeholderText}>{t('chart.loading', { symbol })}</Text>
          </View>
        )}
        renderError={() => (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>{t('chart.loadError')}</Text>
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
