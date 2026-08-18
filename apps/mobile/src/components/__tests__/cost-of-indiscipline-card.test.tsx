import { act, create, ReactTestRenderer } from 'react-test-renderer';
import CostOfIndisciplineCard from '@/components/cost-of-indiscipline-card';
import { COST_DISCLAIMER, CostResult } from '@/lib/cost-of-indiscipline';

function renderCard(props: { result: CostResult | null; isPro?: boolean }) {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<CostOfIndisciplineCard {...props} />);
  });
  return { tree, unmount: () => act(() => tree.unmount()) };
}

function makeResult(overrides: Partial<CostResult> = {}): CostResult {
  return {
    totalTrades: 35,
    deviatedCount: 5,
    actualPnl: 170,
    hypotheticalPnl: 300,
    cost: 130,
    skippedIncomplete: 2,
    showable: true,
    hiddenReason: null,
    ...overrides,
  };
}

// Chuyển tree JSON thành chuỗi text thuần để assert nội dung (tránh snapshot nhạy cảm style)
function textOf(tree: ReactTestRenderer): string {
  const json = tree.toJSON();
  const texts: string[] = [];
  const walk = (node: unknown) => {
    if (node == null || typeof node !== 'object') return;
    const n = node as { children?: unknown[] };
    if (Array.isArray(n.children)) {
      for (const c of n.children) {
        if (typeof c === 'string') texts.push(c);
        else walk(c);
      }
    }
  };
  walk(json);
  return texts.join(' ');
}

// RN Text tách text node (vd "$" + "130.00" → "$ 130.00") — bỏ space cả 2 phía để assert ổn định
const norm = (s: string) => s.replace(/\s+/g, '');

describe('CostOfIndisciplineCard (Module 4 — AC disclaimer ở MỌI nơi hiển thị con số)', () => {
  it('AC: disclaimer xuất hiện khi hiển thị con số cost', () => {
    const { tree, unmount } = renderCard({ result: makeResult() });
    const t = textOf(tree);
    expect(norm(t)).toContain(norm('Chi phí của sự vô kỷ luật'));
    expect(norm(t)).toContain('$130.00');
    expect(norm(t)).toContain(norm(COST_DISCLAIMER()));
    unmount();
  });

  it('AC: không hiển thị con số khi chưa đủ ngưỡng — thay bằng thông báo', () => {
    const { tree, unmount } = renderCard({
      result: makeResult({ showable: false, hiddenReason: 'Cần thêm dữ liệu để tính chỉ số này (hiện có 12/30 lệnh).' }),
    });
    const t = textOf(tree);
    expect(norm(t)).toContain(norm('Cần thêm dữ liệu'));
    expect(norm(t)).not.toContain('$130.00');
    expect(norm(t)).not.toContain('$');
    unmount();
  });

  it('result null → không render gì', () => {
    const { tree, unmount } = renderCard({ result: null });
    expect(tree.toJSON()).toBeNull();
    unmount();
  });

  it('disclaimer hiển thị CẢ khi Pro (breakdown mở rộng) — không bao giờ bỏ', () => {
    const { tree, unmount } = renderCard({ result: makeResult({ skippedIncomplete: 3 }), isPro: true });
    const t = textOf(tree);
    expect(norm(t)).toContain(norm(COST_DISCLAIMER()));
    expect(norm(t)).toContain(norm('Bỏ qua 3 lệnh thiếu dữ liệu plan'));
    unmount();
  });
});
