/**
 * Personal Danger Zone — Retention Layer Module 6 (logic dùng chung cho
 * Today Dashboard Module 2 — 1 dòng tóm tắt).
 *
 * Ngưỡng thống nhất (BẤT BIẾN, không hạ):
 *   - Tổng số lệnh ĐÃ ĐÓNG ≥ 30  (MIN_CLOSED_TRADES)
 *   - Pattern cụ thể xuất hiện ≥ 5 lần (MIN_PATTERN_OCCURRENCE)
 *
 * Pattern Phase này: giờ trong ngày có nhiều vi phạm kỷ luật nhất
 * (tính theo giờ entry_time của lệnh bị vi phạm — dữ liệu thật, không suy đoán).
 */

import i18n from '@/i18n';

export const MIN_CLOSED_TRADES = 30;
export const MIN_PATTERN_OCCURRENCE = 5;

export type DangerZonePattern = {
  /** Giờ trong ngày (0-23) có nhiều vi phạm nhất */
  hour: number;
  /** Số lần pattern lặp lại */
  count: number;
  /** Tổng lệnh đã đóng đang xét */
  totalClosed: number;
};

export type DangerZoneInput = {
  /** Lệnh đã đóng: cần id + entry_time để xác định giờ giao dịch */
  closedExecutions: { id: string; entry_time: string }[];
  /** Vi phạm: cần trade_execution_id + is_negative (loại adaptive_decision tích cực) */
  violations: { trade_execution_id: string | null; is_negative: boolean }[];
};

/**
 * Tìm pattern danger zone theo giờ.
 * Trả null khi: chưa đủ 30 lệnh đóng HOẶC pattern chưa đủ 5 lần lặp
 * (không hiển thị kết luận từ dữ liệu ít — đúng AC Module 6).
 */
/**
 * Giờ trong ngày (0-23) theo timezone user (IANA, VD 'Asia/Ho_Chi_Minh').
 * Không truyền timezone → fallback device-local (hành vi cũ, giữ test pass).
 * Dùng Intl (không phụ thuộc thư viện) — Hermes/RN hỗ trợ.
 */
export function hourInZone(iso: string, timezone?: string): number {
  if (!timezone) return new Date(iso).getHours();
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(new Date(iso));
    const h = parts.find((p) => p.type === 'hour')?.value;
    return h != null ? Number(h) % 24 : new Date(iso).getHours();
  } catch {
    // timezone không hợp lệ → device-local (không crash, không suy đoán sai)
    return new Date(iso).getHours();
  }
}

/** Ngày (YYYY-MM-DD) theo timezone user — dùng cho nhóm "lệnh thứ N trong ngày". */
export function dayKeyInZone(iso: string, timezone?: string): string {
  if (!timezone) return iso.slice(0, 10);
  try {
    // en-CA cho ra định dạng YYYY-MM-DD đúng thứ tự
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function findDangerZonePattern(
  input: DangerZoneInput,
  timezone?: string,
): DangerZonePattern | null {
  const { closedExecutions, violations } = input;
  const totalClosed = closedExecutions.length;
  if (totalClosed < MIN_CLOSED_TRADES) return null;

  const execById = new Map(closedExecutions.map((e) => [e.id, e]));
  const hourCounts: Record<number, number> = {};
  for (const v of violations) {
    if (v.is_negative === false) continue; // adaptive_decision không phải vi phạm thật
    if (!v.trade_execution_id) continue;
    const exec = execById.get(v.trade_execution_id);
    if (!exec) continue;
    const hour = hourInZone(exec.entry_time, timezone);
    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;
  }

  let best: { hour: number; count: number } | null = null;
  for (const [h, c] of Object.entries(hourCounts)) {
    if (c >= MIN_PATTERN_OCCURRENCE && (!best || c > best.count)) {
      best = { hour: Number(h), count: c };
    }
  }
  return best ? { hour: best.hour, count: best.count, totalClosed } : null;
}

/** 1 dòng tóm tắt cho Today Dashboard (Free). */
export function dangerZoneSummary(pattern: DangerZonePattern): string {
  return i18n.t('dangerZone.summary', {
    hour: pattern.hour,
    count: pattern.count,
    total: pattern.totalClosed,
  });
}

/**
 * Pattern "lệnh thứ N trong ngày": vi phạm thường xảy ra ở lệnh thứ mấy của ngày.
 * VD: "vi phạm xảy ra nhiều nhất ở lệnh thứ 3 trong ngày".
 */
export type NthOrderPattern = {
  /** Thứ tự lệnh trong ngày (1-based) */
  nth: number;
  count: number;
  totalClosed: number;
};

export type DangerZoneDetail = {
  hourPattern: DangerZonePattern | null;
  nthOrderPattern: NthOrderPattern | null;
};

/**
 * Tìm pattern "lệnh thứ N trong ngày" — ngưỡng ≥30 lệnh + pattern ≥5 lần.
 * Tính thứ tự lệnh trong ngày theo entry_time (cùng ngày → đếm tăng dần).
 */
export function findNthOrderPattern(
  input: DangerZoneInput,
  timezone?: string,
): NthOrderPattern | null {
  const { closedExecutions, violations } = input;
  const totalClosed = closedExecutions.length;
  if (totalClosed < MIN_CLOSED_TRADES) return null;

  const execById = new Map(closedExecutions.map((e) => [e.id, e]));
  // Thứ tự lệnh trong ngày: sort theo entry_time rồi đánh số theo ngày
  const sorted = [...closedExecutions].sort(
    (a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime(),
  );
  const dayKey = (iso: string) => dayKeyInZone(iso, timezone);
  const orderByDay = new Map<string, Map<string, number>>(); // day -> execId -> nth
  const countsByDay = new Map<string, number>();
  for (const e of sorted) {
    const d = dayKey(e.entry_time);
    const n = (countsByDay.get(d) ?? 0) + 1;
    countsByDay.set(d, n);
    const m = orderByDay.get(d) ?? new Map();
    m.set(e.id, n);
    orderByDay.set(d, m);
  }

  const nthCounts: Record<number, number> = {};
  for (const v of violations) {
    if (v.is_negative === false) continue;
    if (!v.trade_execution_id) continue;
    const exec = execById.get(v.trade_execution_id);
    if (!exec) continue;
    const nth = orderByDay.get(dayKey(exec.entry_time))?.get(exec.id);
    if (nth == null) continue;
    nthCounts[nth] = (nthCounts[nth] ?? 0) + 1;
  }

  let best: { nth: number; count: number } | null = null;
  for (const [n, c] of Object.entries(nthCounts)) {
    if (c >= MIN_PATTERN_OCCURRENCE && (!best || c > best.count)) {
      best = { nth: Number(n), count: c };
    }
  }
  return best ? { nth: best.nth, count: best.count, totalClosed } : null;
}

/** Tổng hợp đầy đủ patterns cho màn chi tiết (Module 6). */
export function findDangerZoneDetail(
  input: DangerZoneInput,
  timezone?: string,
): DangerZoneDetail {
  return {
    hourPattern: findDangerZonePattern(input, timezone),
    nthOrderPattern: findNthOrderPattern(input, timezone),
  };
}

/** Câu tóm tắt cho pattern "lệnh thứ N". */
export function nthOrderSummary(p: NthOrderPattern): string {
  return i18n.t('dangerZone.nthOrderSummary', {
    nth: p.nth,
    count: p.count,
    total: p.totalClosed,
  });
}
