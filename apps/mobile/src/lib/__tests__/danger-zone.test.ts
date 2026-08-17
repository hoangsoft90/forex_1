import {
  dangerZoneSummary,
  findDangerZonePattern,
  findNthOrderPattern,
  MIN_CLOSED_TRADES,
  MIN_PATTERN_OCCURRENCE,
  nthOrderSummary,
} from '@/lib/danger-zone';

// helper: tạo N lệnh đóng với entry_time chỉ định
function makeExecs(n: number, hour = 9): { id: string; entry_time: string }[] {
  const out: { id: string; entry_time: string }[] = [];
  for (let i = 0; i < n; i++) {
    const h = `${String(hour).padStart(2, '0')}`;
    out.push({ id: `e${i}`, entry_time: `2026-08-01T${h}:15:00Z` });
  }
  return out;
}

function makeViolations(ids: string[]): { trade_execution_id: string | null; is_negative: boolean }[] {
  return ids.map((id) => ({ trade_execution_id: id, is_negative: true }));
}

describe('Personal Danger Zone (Module 6 — dùng ở Today Dashboard Module 2)', () => {
  it('ngưỡng cố định: 30 lệnh + pattern ≥ 5 lần', () => {
    expect(MIN_CLOSED_TRADES).toBe(30);
    expect(MIN_PATTERN_OCCURRENCE).toBe(5);
  });

  it('AC: 25 lệnh (dưới ngưỡng) → ẩn, kể cả khi có pattern lặp', () => {
    const execs = makeExecs(25, 9);
    const viols = makeViolations(['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7']);
    expect(findDangerZonePattern({ closedExecutions: execs, violations: viols })).toBeNull();
  });

  it('AC: 35 lệnh + pattern lặp 6 lần cùng giờ → hiện đúng giờ + số lần', () => {
    const execs = makeExecs(35, 14); // tất cả 14:00
    const viols = makeViolations(['e0', 'e1', 'e2', 'e3', 'e4', 'e5']); // 6 lần
    const r = findDangerZonePattern({ closedExecutions: execs, violations: viols });
    expect(r).not.toBeNull();
    expect(r?.hour).toBe(14);
    expect(r?.count).toBe(6);
    expect(r?.totalClosed).toBe(35);
  });

  it('35 lệnh nhưng pattern chỉ 3 lần → ẩn (chưa đủ 5)', () => {
    const execs = makeExecs(35, 9);
    const viols = makeViolations(['e1', 'e2', 'e3']);
    expect(findDangerZonePattern({ closedExecutions: execs, violations: viols })).toBeNull();
  });

  it('pattern 5 lần nhưng lệnh < 30 → ẩn', () => {
    const execs = makeExecs(20, 9);
    const viols = makeViolations(['e1', 'e2', 'e3', 'e4', 'e5']);
    expect(findDangerZonePattern({ closedExecutions: execs, violations: viols })).toBeNull();
  });

  it('vi phạm adaptive_decision (is_negative=false) không tính vào pattern', () => {
    const execs = makeExecs(35, 9);
    const viols: { trade_execution_id: string | null; is_negative: boolean }[] = ['e0', 'e1', 'e2', 'e3', 'e4', 'e5'].map(
      (id) => ({ trade_execution_id: id, is_negative: false }),
    );
    expect(findDangerZonePattern({ closedExecutions: execs, violations: viols })).toBeNull();
  });

  it('chọn giờ có số lần cao nhất khi nhiều giờ cùng đủ ngưỡng', () => {
    const execs = [
      ...makeExecs(20, 9), // e0..e19 @ 9:00
      ...makeExecs(15, 16).map((e) => ({ ...e, id: e.id.replace('e', 'b') })), // b0..b14 @ 16:00
    ];
    const viols = makeViolations([
      'e0', 'e1', 'e2', 'e3', 'e4', 'e5', // 9:00 — 6 lần
      'b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', // 16:00 — 8 lần
    ]);
    const r = findDangerZonePattern({ closedExecutions: execs, violations: viols });
    expect(r?.hour).toBe(16);
    expect(r?.count).toBe(8);
  });

  it('summary lấy đúng số liệu thật, không câu mẫu tĩnh', () => {
    const s = dangerZoneSummary({ hour: 14, count: 6, totalClosed: 35 });
    expect(s).toContain('14:00');
    expect(s).toContain('6 lần');
    expect(s).toContain('35 lệnh');
  });

  describe('Nth-order pattern (Module 6 — màn chi tiết)', () => {
    it('AC: 25 lệnh → ẩn kể cả khi pattern lặp', () => {
      const execs = makeExecs(25, 9);
      const viols = makeViolations(['e1', 'e2', 'e3', 'e4', 'e5']);
      expect(findNthOrderPattern({ closedExecutions: execs, violations: viols })).toBeNull();
    });

    it('AC: 36 lệnh/6 ngày, vi phạm 6 lần đều ở lệnh thứ 3 trong ngày → hiện đúng nth=3', () => {
      // 6 ngày × 6 lệnh/ngày = 36 lệnh (≥30). Mỗi ngày: lệnh thứ 3 (index 2) bị vi phạm.
      const execs: { id: string; entry_time: string }[] = [];
      const violIds: string[] = [];
      for (let d = 1; d <= 6; d++) {
        const day = `2026-08-0${d}`;
        for (let n = 0; n < 6; n++) {
          const id = `d${d}n${n}`;
          execs.push({ id, entry_time: `${day}T${String(8 + n).padStart(2, '0')}:00:00Z` });
          if (n === 2) violIds.push(id); // lệnh thứ 3 trong ngày
        }
      }
      const viols = makeViolations(violIds); // 6 lần, đều nth=3
      const r = findNthOrderPattern({ closedExecutions: execs, violations: viols });
      expect(r).not.toBeNull();
      expect(r?.nth).toBe(3);
      expect(r?.count).toBe(6);
      expect(r?.totalClosed).toBe(36);
    });

    it('pattern chỉ 3 lần → ẩn', () => {
      const execs: { id: string; entry_time: string }[] = [];
      const violIds: string[] = [];
      for (let d = 1; d <= 6; d++) {
        const day = `2026-08-0${d}`;
        for (let n = 0; n < 6; n++) {
          const id = `d${d}n${n}`;
          execs.push({ id, entry_time: `${day}T${String(8 + n).padStart(2, '0')}:00:00Z` });
          if (n === 2 && d <= 3) violIds.push(id); // chỉ 3 ngày có vi phạm nth=3
        }
      }
      expect(findNthOrderPattern({ closedExecutions: execs, violations: makeViolations(violIds) })).toBeNull();
    });

    it('nthOrderSummary lấy đúng số liệu', () => {
      const s = nthOrderSummary({ nth: 3, count: 6, totalClosed: 35 });
      expect(s).toContain('lệnh thứ 3');
      expect(s).toContain('6 lần');
      expect(s).toContain('35 lệnh');
    });
  });
});
