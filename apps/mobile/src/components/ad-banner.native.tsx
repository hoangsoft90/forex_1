/**
 * ad-banner.native.tsx — Bottom banner AdMob (native).
 *
 * ⚠️ Yêu cầu #2: KHÔNG bị che khuất bởi Android 3 nút điều hướng (back/home/recents).
 * Giải pháp: dùng `useSafeAreaInsets().bottom` làm padding dưới banner —
 * safe area inset đã bao gồm chiều cao navigation bar (3 nút) khi edge-to-edge.
 * (app.json cấu hình `navigationBar` transparent + edgeToEdge để inset hoạt động đúng.)
 */

import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getAdUnitId, TEST_ADS } from '@/lib/ads-config';

type Props = {
  /** Nếu true → ẩn banner (vd màn hình cần toàn màn hình) */
  hidden?: boolean;
};

export default function AdBanner({ hidden = false }: Props) {
  const insets = useSafeAreaInsets();
  const unitId = getAdUnitId('banner');

  if (hidden || !unitId) return null;

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom }]}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={(err) => {
          // Graceful: banner fail không crash app.
          if (TEST_ADS) console.warn('[ads] Banner test ad load fail:', err.message);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
});
