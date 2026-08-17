/**
 * Push Notification content — Retention Layer Module 8 (P1).
 *
 * 2 loại thông báo DUY NHẤT ở Phase này (không thêm loại khác — tránh spam):
 *   1. Morning brief (mặc định 08:00 theo timezone user): Discipline Score hôm qua + rules hôm nay.
 *   2. Evening review (mặc định 21:00): CHỈ gửi nếu có lệnh đóng trong ngày — không có → KHÔNG gửi
 *      (tránh notification rỗng gây khó chịu).
 *
 * TONE BẮT BUỘC (plan1_final_v2 mục 8 — "Auditor cân bằng"): trung tính-khích lệ,
 * KHÔNG phán xét/hù dọa. Tránh: "Bạn lại vi phạm rồi!" → dùng: "Discipline Score hôm nay: 82. Xem chi tiết?"
 */

export type MorningBriefInput = {
  /** Discipline Score hôm qua (snapshot gần nhất) — null nếu chưa có */
  yesterdayScore: number | null;
  /** Danh sách rule active hôm nay (label) */
  activeRules: string[];
};

export type EveningReviewInput = {
  /** Có lệnh nào đóng trong ngày hôm nay không */
  hasClosedToday: boolean;
  /** Số lệnh đóng hôm nay (chỉ để hiển thị khi > 0) */
  closedCount: number;
};

export type NotificationContent =
  | { ok: true; title: string; body: string }
  | { ok: false; reason: 'no_evening_trades' };

/** Morning brief — tông trung tính-khích lệ, không phán xét. */
export function buildMorningBrief(input: MorningBriefInput): NotificationContent {
  const scoreLine =
    input.yesterdayScore != null
      ? `Discipline Score hôm qua: ${Math.round(input.yesterdayScore)}.`
      : 'Bắt đầu ghi nhận lệnh để có điểm kỷ luật.';

  if (input.activeRules.length === 0) {
    return {
      ok: true,
      title: 'Chúc một ngày giao dịch tốt lành',
      body: `${scoreLine} Thiết lập hiến pháp giao dịch để bắt đầu.`,
    };
  }
  const rulesLine = input.activeRules.slice(0, 3).join(', ');
  return {
    ok: true,
    title: 'Chúc một ngày giao dịch tốt lành',
    body: `${scoreLine} Rules hôm nay: ${rulesLine}.`,
  };
}

/** Evening review — CHỈ trả nội dung khi có lệnh đóng trong ngày; không → ok:false. */
export function buildEveningReview(input: EveningReviewInput): NotificationContent {
  if (!input.hasClosedToday || input.closedCount <= 0) {
    return { ok: false, reason: 'no_evening_trades' };
  }
  return {
    ok: true,
    title: 'Xem lại hôm nay',
    body: `Bạn đã đóng ${input.closedCount} lệnh hôm nay. Dành 1 phút review — mọi nhận xét đều là thông tin, không phải phán xét.`,
  };
}
