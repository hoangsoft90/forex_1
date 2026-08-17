/**
 * Onboarding Instant Audit — Retention Layer Module 3 (P0, có GATE CỨNG).
 *
 * 3.1 Điều kiện bật: chỉ hiển thị bước này trong luồng Onboarding nếu
 *     `INSTANT_AUDIT_ENABLED = true` (xem Module 0).
 *     ⚠️ GATE CỨNG: chỉ đổi thành true sau khi Module 0 đạt ≥95% parse đúng
 *     trên dữ liệu THẬT (≥3 nguồn) VÀ được xác nhận thủ công. KHÔNG tự hạ
 *     ngưỡng, KHÔNG tự bật flag sớm. Nếu không chắc → giữ false.
 *
 * 3.3 Fallback (mặc định hiện tại — vĩnh viễn cho đến khi gate mở):
 *     dùng `weakness_profile` jsonb từ Quiz → màn hình "Dự đoán điểm yếu của bạn".
 */

import { supabase } from '@/lib/supabase';
import { detectViolations } from '@/lib/violations';

/**
 * Flag gate cứng — MẶC ĐỊNH FALSE. Chỉ bật sau khi Module 0 verified thật ≥95%.
 * Giá trị thật đọc từ bảng `feature_flags` (schema.sql mục 13) — KHÔNG hardcode
 * (theo đúng data_model.md mục 13). Fallback false nếu đọc lỗi (an toàn).
 */
export const INSTANT_AUDIT_ENABLED_FALLBACK = false;

/** Đọc flag từ bảng feature_flags — false khi lỗi/chưa có (gate cứng an toàn). */
export async function isInstantAuditEnabled(): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('feature_flags')
      .select('is_enabled')
      .eq('flag_name', 'INSTANT_AUDIT_ENABLED')
      .maybeSingle();
    return data?.is_enabled === true;
  } catch {
    return INSTANT_AUDIT_ENABLED_FALLBACK;
  }
}

/**
 * Nhãn tiếng Việt cho từng key trong weakness_profile (khớp quiz trong weakness-quiz.ts).
 * Dùng cho màn hình fallback 3.3 — liệt kê lại điểm user tự nhận dưới dạng cá nhân hóa.
 */
export const WEAKNESS_LABELS: Record<string, { label: string; description: string }> = {
  revenge_trading: {
    label: 'Revenge trading',
    description: 'Mở lệnh ngược chiều ngay sau khi bị dừng lỗ.',
  },
  moves_sl: {
    label: 'Dời Stop Loss',
    description: 'Dời SL ra xa hơn khi giá đi ngược dự kiến.',
  },
  increases_lot_after_loss: {
    label: 'Tăng lot sau thua',
    description: 'Tăng khối lượng để "gỡ" lại sau lệnh thua.',
  },
  trades_before_news: {
    label: 'Giao dịch trước tin lớn',
    description: 'Vào lệnh ngay trước/trong tin kinh tế lớn (NFP, CPI...).',
  },
  trades_without_plan: {
    label: 'Vào lệnh không plan',
    description: 'Không xác định trước Entry/SL/TP.',
  },
  overtrades: {
    label: 'Giao dịch quá nhiều',
    description: 'Nhiều lệnh trong ngày hơn kế hoạch ban đầu.',
  },
  overconfident_size: {
    label: 'Khối lượng quá mức',
    description: 'Vào lệnh lot lớn hơn mức rủi ro đã đặt ra.',
  },
};

/** Liệt kê điểm yếu user tự nhận (true) — cho màn hình fallback 3.3. */
export function listWeaknesses(profile: Record<string, boolean> | null): {
  key: string;
  label: string;
  description: string;
}[] {
  if (!profile) return [];
  return Object.entries(profile)
    .filter(([, v]) => v === true)
    .map(([key]) => {
      const meta = WEAKNESS_LABELS[key];
      return meta
        ? { key, label: meta.label, description: meta.description }
        : { key, label: key, description: '' };
    });
}

/** Đếm violation + ước tính chi phí (tổng pnl âm của lệnh vi phạm) — Module 3.2. */
export type InstantAuditResult = {
  totalTrades: number;
  /** violation_type -> { count, estimatedCost } */
  violations: Record<string, { count: number; estimatedCost: number }>;
};

/**
 * Chạy Behavior Engine HIỆN CÓ (detectViolations — không viết logic mới)
 * trên tập lệnh vừa import. Trả về đếm + chi phí ước tính từ pnl thật
 * (tổng pnl_amount âm của các lệnh bị phát hiện — không suy đoán).
 */
export function computeInstantAudit(
  executions: {
    id: string;
    direction: 'buy' | 'sell';
    lot_size: number;
    actual_risk_percent: number | null;
    entry_time: string;
    exit_time: string | null;
    pnl_amount: number | null;
  }[],
): InstantAuditResult {
  const violations: Record<string, { count: number; estimatedCost: number }> = {};
  const sorted = [...executions].sort(
    (a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime(),
  );

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const prev = i > 0 ? sorted[i - 1] : null;
    const found = detectViolationsForAudit(cur, prev);
    for (const v of found) {
      violations[v.type] = violations[v.type] ?? { count: 0, estimatedCost: 0 };
      violations[v.type].count += 1;
      if ((cur.pnl_amount ?? 0) < 0) {
        violations[v.type].estimatedCost += Math.abs(cur.pnl_amount ?? 0);
      }
    }
  }
  return { totalTrades: sorted.length, violations };
}

/**
 * Gọi detectViolations của Behavior Engine với context tối giản.
 * Lưu ý: dữ liệu import MT4/MT5 không có sl_adjustments → hope_trading (dời SL)
 * không phát hiện được từ export chuẩn (chỉ phát hiện qua app nhập tay) — ghi chú rõ.
 */
function detectViolationsForAudit(
  cur: {
    id: string;
    direction: 'buy' | 'sell';
    lot_size: number;
    actual_risk_percent: number | null;
    entry_time: string;
    exit_time: string | null;
  },
  prev: {
    direction: 'buy' | 'sell';
    lot_size: number;
    pnl_amount: number | null;
    exit_time: string | null;
  } | null,
) {
  return detectViolations({
    execution: cur,
    plan: null, // lệnh import MT4 không có plan liên kết
    slAdjustmentCount: 0, // MT4 export chuẩn không có dữ liệu dời SL
    previousClosed: prev
      ? { direction: prev.direction, lot_size: prev.lot_size, pnl_amount: prev.pnl_amount, exit_time: prev.exit_time }
      : null,
  });
}

/** Format kết quả audit dạng câu (Module 3.2). */
export function formatInstantAudit(result: InstantAuditResult): string {
  const parts: string[] = [];
  const order: Record<string, string> = {
    hope_trading: 'dời SL',
    revenge_trading: 'revenge trade',
    martingale_negative: 'tăng lot sau thua',
    overconfidence_size: 'vào lệnh quá khối lượng',
  };
  for (const [type, meta] of Object.entries(result.violations)) {
    const verb = order[type] ?? type;
    parts.push(
      `${verb} ${meta.count} lần (mất khoảng $${meta.estimatedCost.toFixed(2)})`,
    );
  }
  if (parts.length === 0) {
    return `Trong ${result.totalTrades} lệnh gần đây, chưa phát hiện vi phạm kỷ luật nào từ dữ liệu này.`;
  }
  return `Trong ${result.totalTrades} lệnh gần đây, bạn đã ${parts.join(', ')}.`;
}
