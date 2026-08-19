import { buildSpotlightBands, computeTooltipPosition, measureNode, Rect, Size } from '@/lib/guidance-position';

const SCREEN: Size = { width: 400, height: 800 };

describe('computeTooltipPosition', () => {
  it('placement mặc định bottom: nằm dưới target, căn giữa theo target', () => {
    const target: Rect = { x: 100, y: 100, width: 80, height: 40 };
    const r = computeTooltipPosition({ targetRect: target, tooltipSize: { width: 100, height: 50 }, screen: SCREEN });
    expect(r.placement).toBe('bottom');
    expect(r.x).toBe(100 + 40 - 50); // cx - w/2
    expect(r.y).toBe(100 + 40 + 8); // target.bottom + margin
  });

  it('placement ưu tiên top nhưng không đủ chỗ → flip xuống bottom', () => {
    const target: Rect = { x: 100, y: 0, width: 80, height: 40 }; // sát mép trên
    const r = computeTooltipPosition({
      targetRect: target,
      tooltipSize: { width: 100, height: 50 },
      screen: SCREEN,
      placement: 'top',
    });
    expect(r.placement).toBe('bottom');
    expect(r.y).toBe(0 + 40 + 8);
  });

  it('sát mép phải → clamp để không tràn khỏi màn hình', () => {
    const target: Rect = { x: 380, y: 100, width: 20, height: 40 };
    const r = computeTooltipPosition({ targetRect: target, tooltipSize: { width: 100, height: 50 }, screen: SCREEN });
    expect(r.x + 100).toBeLessThanOrEqual(SCREEN.width - 8);
  });

  it('left/right: đặt cạnh target theo chiều ngang', () => {
    const target: Rect = { x: 200, y: 200, width: 50, height: 50 };
    const left = computeTooltipPosition({
      targetRect: target,
      tooltipSize: { width: 60, height: 40 },
      screen: SCREEN,
      placement: 'left',
    });
    expect(left.placement).toBe('left');
    expect(left.x).toBe(200 - 60 - 8);
    expect(left.y).toBe(200 + 25 - 20); // cy - h/2

    const right = computeTooltipPosition({
      targetRect: target,
      tooltipSize: { width: 60, height: 40 },
      screen: SCREEN,
      placement: 'right',
    });
    expect(right.placement).toBe('right');
    expect(right.x).toBe(200 + 50 + 8);
    expect(right.y).toBe(200 + 25 - 20);
  });

  it('cả 2 hướng không vừa (tooltip quá to) → clamp, không trả vị trí ngoài màn hình', () => {
    const target: Rect = { x: 0, y: 0, width: 10, height: 10 };
    const r = computeTooltipPosition({ targetRect: target, tooltipSize: { width: 500, height: 1000 }, screen: SCREEN });
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.y).toBeGreaterThanOrEqual(0);
    expect(r.x).toBeLessThanOrEqual(SCREEN.width);
    expect(r.y).toBeLessThanOrEqual(SCREEN.height);
  });
});

describe('buildSpotlightBands', () => {
  it('4 band ghép lại phủ đúng toàn màn hình trừ vùng target', () => {
    const target: Rect = { x: 100, y: 100, width: 80, height: 40 };
    const bands = buildSpotlightBands(target, SCREEN);
    expect(bands).toHaveLength(4);
    const totalDim = bands.reduce((sum, b) => sum + b.width * b.height, 0);
    expect(totalDim).toBe(SCREEN.width * SCREEN.height - target.width * target.height);
  });

  it('target tràn mép trên → vẫn không ra band âm', () => {
    const target: Rect = { x: 100, y: -20, width: 80, height: 40 };
    const bands = buildSpotlightBands(target, SCREEN);
    for (const b of bands) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.width).toBeGreaterThanOrEqual(0);
      expect(b.height).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('measureNode', () => {
  it('native: dùng measureInWindow', async () => {
    const node = { measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => cb(10, 20, 30, 40) };
    await expect(measureNode(node)).resolves.toEqual({ x: 10, y: 20, width: 30, height: 40 });
  });

  it('web: dùng getBoundingClientRect khi không có measureInWindow', async () => {
    const node = { getBoundingClientRect: () => ({ left: 5, top: 6, width: 70, height: 80 }) };
    await expect(measureNode(node)).resolves.toEqual({ x: 5, y: 6, width: 70, height: 80 });
  });

  it('null hoặc node không hỗ trợ → null (không crash)', async () => {
    await expect(measureNode(null)).resolves.toBeNull();
    await expect(measureNode(undefined)).resolves.toBeNull();
    await expect(measureNode({})).resolves.toBeNull();
  });
});
