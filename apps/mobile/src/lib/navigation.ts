/**
 * navigation.ts — Helper điều hướng an toàn (safe-back pattern).
 *
 * Vấn đề: `router.back()` khi không có màn hình trước (vd: user mở thẳng
 * deep-link vào màn hình con) sẽ không làm gì → app kẹt không quay về được.
 *
 * Giải pháp: `safeBack(router, fallback)` — nếu `router.canGoBack()` thì back
 * bình thường, ngược lại `router.replace(fallback)` để luôn có lối thoát.
 * Áp dụng CHO MỌI nút "Quay lại" thủ công trong app.
 */

import { useRouter, type Href } from 'expo-router';

export type SafeRouter = ReturnType<typeof useRouter>;

/**
 * Quay lại an toàn: back nếu có lịch sử, ngược lại thay thế bằng fallback.
 * @param router  router từ useRouter()
 * @param fallback route thay thế khi không back được (VD '/(main)')
 */
export function safeBack(router: SafeRouter, fallback: Href): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
