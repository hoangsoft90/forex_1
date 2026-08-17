/**
 * ad-banner.tsx — WEB STUB của bottom banner AdMob.
 * Native dùng BannerAd (react-native-google-mobile-ads) — xem ad-banner.native.tsx.
 * Trên web: không hiển thị ads (AdMob SDK không chạy web), giữ placeholder trống
 * để layout không vỡ.
 */

import { StyleSheet, View } from 'react-native';

type Props = {
  hidden?: boolean;
};

export default function AdBanner({ hidden = false }: Props) {
  if (hidden) return null;
  return <View style={styles.wrap} />;
}

const styles = StyleSheet.create({
  wrap: { height: 50 },
});
