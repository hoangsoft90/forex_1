/**
 * guidance-position.ts — Hình học cho In-app Guidance (thuần, KHÔNG import react-native).
 *
 * Tách logic vị trí ra lib thuần để unit test được: truyền rect giả + kích thước màn hình
 * → assert vị trí/placement sau khi flip/clamp, không cần chạy app.
 *
 * Gồm 3 phần:
 *  - computeTooltipPosition(): placement ưu tiên → tự flip khi thiếu chỗ → clamp trong màn hình.
 *  - buildSpotlightBands(): 4 band làm mờ quanh element target (không cần SVG — 4 View absolute).
 *  - measureNode(): đo rect của element qua ref — native (measureInWindow) / web (getBoundingClientRect).
 */

export type Placement = 'top' | 'bottom' | 'left' | 'right';

export type Rect = { x: number; y: number; width: number; height: number };

export type Size = { width: number; height: number };

/** Khoảng cách tối thiểu tooltip ↔ mép màn hình / element target. */
const DEFAULT_MARGIN = 8;

/** Hướng ngược lại — dùng khi flip vì không đủ chỗ. */
const OPPOSITE: Record<Placement, Placement> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

function clamp(v: number, min: number, max: number): number {
  // max < min (tooltip lớn hơn màn hình — hiếm): giữ min để không tràn 2 phía
  if (max < min) return min;
  return Math.min(Math.max(v, min), max);
}

/**
 * Tính vị trí tooltip (góc trên-trái) dựa trên rect element target.
 *
 * Logic:
 *  1. Thử placement ưu tiên (mặc định 'bottom' — dưới target, căn giữa theo target).
 *  2. Nếu không đủ chỗ → flip sang hướng ngược lại.
 *  3. Nếu cả 2 đều không vừa (tooltip quá to) → giữ hướng ưu tiên rồi clamp vào màn hình.
 *
 * @returns vị trí x/y + placement THỰC TẾ đã dùng (để component vẽ mũi tên đúng hướng).
 */
export function computeTooltipPosition(opts: {
  targetRect: Rect;
  tooltipSize: Size;
  screen: Size;
  placement?: Placement;
  margin?: number;
}): { x: number; y: number; placement: Placement } {
  const { targetRect, tooltipSize, screen } = opts;
  const margin = opts.margin ?? DEFAULT_MARGIN;
  const preferred = opts.placement ?? 'bottom';
  const { width: w, height: h } = tooltipSize;

  // Tọa độ nếu đặt theo một hướng (góc trên-trái của tooltip)
  const at = (placement: Placement) => {
    const cx = targetRect.x + targetRect.width / 2;
    const cy = targetRect.y + targetRect.height / 2;
    switch (placement) {
      case 'bottom':
        return { x: cx - w / 2, y: targetRect.y + targetRect.height + margin };
      case 'top':
        return { x: cx - w / 2, y: targetRect.y - h - margin };
      case 'left':
        return { x: targetRect.x - w - margin, y: cy - h / 2 };
      case 'right':
        return { x: targetRect.x + targetRect.width + margin, y: cy - h / 2 };
    }
  };

  // Tooltip có nằm gọn trong màn hình (với lề margin) không
  const fits = (placement: Placement) => {
    const p = at(placement);
    return (
      p.x >= margin &&
      p.y >= margin &&
      p.x + w <= screen.width - margin &&
      p.y + h <= screen.height - margin
    );
  };

  let placement = fits(preferred) ? preferred : OPPOSITE[preferred];
  if (!fits(placement)) placement = preferred; // cả 2 hướng không vừa → clamp thay vì bỏ

  const pos = at(placement);
  return {
    x: clamp(pos.x, margin, Math.max(margin, screen.width - w - margin)),
    y: clamp(pos.y, margin, Math.max(margin, screen.height - h - margin)),
    placement,
  };
}

/**
 * 4 band làm mờ (dim) quanh rect target — ghép lại phủ toàn màn hình TRỪ phần spotlight
 * (element target). Mỗi band là 1 View absolute nền đen bán trong suốt, không cần SVG.
 */
export function buildSpotlightBands(targetRect: Rect, screen: Size): Rect[] {
  const { x, y, width, height } = targetRect;
  const top = Math.max(y, 0);
  const left = Math.max(x, 0);
  const right = Math.min(x + width, screen.width);
  const bottom = Math.min(y + height, screen.height);
  return [
    // Band trên (từ mép màn hình xuống đỉnh target)
    { x: 0, y: 0, width: screen.width, height: top },
    // Band dưới (từ đáy target xuống mép màn hình)
    { x: 0, y: bottom, width: screen.width, height: Math.max(screen.height - bottom, 0) },
    // Band trái (cạnh trái target)
    { x: 0, y: top, width: left, height: Math.max(bottom - top, 0) },
    // Band phải (cạnh phải target)
    { x: right, y: top, width: Math.max(screen.width - right, 0), height: Math.max(bottom - top, 0) },
  ];
}

/**
 * Đo rect (tọa độ màn hình) của một element qua ref.
 * - Native: node.measureInWindow(cb) — trả rect theo window coords.
 * - Web (RN-web): node.getBoundingClientRect() — RN-web không có measureInWindow.
 * Trả null khi node không đo được (chưa mount / không hỗ trợ) → caller ẩn overlay an toàn.
 */
export function measureNode(node: unknown): Promise<Rect | null> {
  return new Promise((resolve) => {
    if (!node) return resolve(null);
    const n = node as {
      measureInWindow?: (cb: (x: number, y: number, width: number, height: number) => void) => void;
      getBoundingClientRect?: () => { left: number; top: number; width: number; height: number };
    };
    if (typeof n.measureInWindow === 'function') {
      n.measureInWindow((x, y, width, height) => {
        if (typeof x === 'number' && Number.isFinite(x)) resolve({ x, y, width, height });
        else resolve(null);
      });
      return;
    }
    if (typeof n.getBoundingClientRect === 'function') {
      const r = n.getBoundingClientRect();
      resolve({ x: r.left, y: r.top, width: r.width, height: r.height });
      return;
    }
    resolve(null);
  });
}
