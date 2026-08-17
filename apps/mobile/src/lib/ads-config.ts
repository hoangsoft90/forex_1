import { Platform } from 'react-native';

/**
 * ads-config.ts — Cấu hình quảng cáo AdMob (Phase 2, Module P2-M1 mở rộng).
 *
 * Đây là FILE CẤU HÌNH DUY NHẤT cho ads — sửa ở đây, không sửa rải rác.
 *
 * Các chế độ:
 *   - `TEST_ADS = true`  (MẶC ĐỊNH) → dùng TEST ad unit IDs của Google.
 *     Ad sẽ hiện "Test ad" (watermark), KHÔNG bị AdMob giới hạn tài khoản,
 *     không tính doanh thu. Dùng cho dev/test trên máy thật.
 *   - `TEST_ADS = false` → dùng ID THẬT từ biến môi trường
 *     (EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID / EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID).
 *     Chỉ đổi sang false khi đã có AdMob account + ad unit thật + app đã submit
 *     lên store (AdMob chặn ad unit chưa được approve nếu dùng ID thật sớm).
 *
 * ⚠️ QUAN TRỌNG khi dùng ID thật (TEST_ADS=false):
 *   - Đăng ký device thật của bạn là TEST DEVICE trong AdMob dashboard
 *     (Apps → chọn app → Ad units → "Test device" tab) TRƯỚC khi chạy,
 *     để không bị AdMob phát hiện click ảo → khóa tài khoản.
 *   - Hoặc set `TEST_DEVICE_IDS` bên dưới để SDK tự coi device đó là test.
 */

/**
 * Flag test ads — MẶC ĐỊNH TRUE (an toàn, tránh AdMob giới hạn tài khoản).
 * Đổi thành false khi ra mắt thật + đã có ad unit thật.
 */
export const TEST_ADS = true;

/** Test ad unit IDs chính thức của Google (an toàn 100%, không cần tài khoản). */
export const TEST_IDS = {
  android: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
  },
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716',
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
  },
};

/** Ad unit IDs thật — lấy từ biến môi trường (chỉ dùng khi TEST_ADS=false). */
const PROD_BANNER_UNIT_ID = process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID;
const PROD_REWARDED_UNIT_ID = process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID;

/**
 * Danh sách device ID được coi là "test device" — khi set qua
 * `mobileAds().setRequestConfiguration({ testDeviceIdentifiers })`,
 * các device này LUÔN nhận ads test kể cả khi dùng ad unit ID thật,
 * tránh bị AdMob đánh giá là click ảo.
 *
 * Cách lấy device ID: chạy app 1 lần, xem log console — dòng dạng
 *   "Use RequestConfiguration.Builder.setTestDeviceIds([\"ABC123...\"])"
 * Copy chuỗi trong ngoặc kép vào mảng bên dưới.
 */
export const TEST_DEVICE_IDS: string[] = [
  // "ABC123-DEVICE-ID-CUA-BAN",
];

/** Chọn đúng ad unit ID theo nền tảng + chế độ test/prod. */
export function getAdUnitId(kind: 'banner' | 'rewarded'): string | null {
  const isIOS = typeof Platform !== 'undefined' && Platform.OS === 'ios';
  if (TEST_ADS) {
    return isIOS ? TEST_IDS.ios[kind] : TEST_IDS.android[kind];
  }
  const prod = kind === 'banner' ? PROD_BANNER_UNIT_ID : PROD_REWARDED_UNIT_ID;
  return prod || null;
}

/**
 * App ID theo nền tảng (dùng để cấu hình plugin app.json — nhưng đó là
 * compile-time; ở đây giữ để tham chiếu/log).
 */
export function isAdmobConfigured(): boolean {
  return TEST_ADS || Boolean(PROD_BANNER_UNIT_ID || PROD_REWARDED_UNIT_ID);
}
