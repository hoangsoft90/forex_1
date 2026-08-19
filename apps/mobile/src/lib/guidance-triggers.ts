/**
 * guidance-triggers.ts — Điều kiện trigger cho guidance (thuần, test được).
 *
 * Nguyên tắc: "chỉ hiện 1 lần, không spam" — tách ra hàm thuần để unit test
 * mọi tổ hợp (đã xem / user mới / user cũ) mà không cần chạy app.
 */

export type TourTriggerOptions = {
  /** Tour đã từng được xem/skip (đọc từ AsyncStorage) chưa. */
  seen: boolean;
  /** Tour này chỉ dành cho user mới? */
  newUsersOnly?: boolean;
  /** User hiện tại có phải "mới" không (caller tự xác định, vd Dashboard: chưa có lệnh/score). */
  isNewUser?: boolean;
};

/**
 * Tour có nên kích hoạt không?
 * - Đã xem/skip rồi → KHÔNG (không spam lần mở app sau).
 * - Chỉ dành user mới (newUsersOnly) nhưng user không mới → KHÔNG.
 * - Còn lại → hiện.
 */
export function shouldStartTour(opts: TourTriggerOptions): boolean {
  if (opts.seen) return false;
  if (opts.newUsersOnly && !opts.isNewUser) return false;
  return true;
}

/** Badge feature có nên hiển thị không (chỉ ẩn khi đã bị dismiss). */
export function shouldShowBadge(dismissed: boolean): boolean {
  return !dismissed;
}
