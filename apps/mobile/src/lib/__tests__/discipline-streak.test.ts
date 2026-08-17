import { computeDisciplineStreak } from '@/lib/discipline-streak';

function exec(id: string, entry_time: string) {
  return { id, entry_time };
}

describe('Discipline Streak (Module 7)', () => {
  it('AC: 8 lệnh liên tiếp followed=true + không vi phạm → streak = 8', () => {
    const executions = Array.from({ length: 8 }, (_, i) =>
      exec(`e${i}`, `2026-08-0${i + 1}T10:00:00Z`),
    );
    const followedByExec: Record<string, boolean> = {};
    executions.forEach((e) => (followedByExec[e.id] = true));
    const r = computeDisciplineStreak({
      executions,
      followedByExec,
      violatedExecIds: new Set(),
    });
    expect(r.streak).toBe(8);
    expect(r.hasTrades).toBe(true);
  });

  it('AC: lệnh thứ 9 vi phạm → streak reset về 0 (chỉ lệnh vi phạm đứng cuối)', () => {
    // 8 lệnh theo plan + lệnh thứ 9 vi phạm (gần nhất) → streak = 0
    const executions = Array.from({ length: 9 }, (_, i) =>
      exec(`e${i}`, `2026-08-0${i + 1}T10:00:00Z`),
    );
    const followedByExec: Record<string, boolean> = {};
    executions.forEach((e) => (followedByExec[e.id] = true));
    const r = computeDisciplineStreak({
      executions,
      followedByExec,
      violatedExecIds: new Set(['e8']), // lệnh gần nhất bị vi phạm
    });
    expect(r.streak).toBe(0);
  });

  it('AC: lệch plan (followed=false) reset streak — test case spec: 8 lệnh xong lệch plan thứ 9', () => {
    const executions = Array.from({ length: 9 }, (_, i) =>
      exec(`e${i}`, `2026-08-0${i + 1}T10:00:00Z`),
    );
    const followedByExec: Record<string, boolean> = {};
    executions.forEach((e) => (followedByExec[e.id] = true));
    followedByExec['e8'] = false; // lệnh thứ 9 lệch plan
    const r = computeDisciplineStreak({
      executions,
      followedByExec,
      violatedExecIds: new Set(),
    });
    expect(r.streak).toBe(0);
  });

  it('streak tính theo entry_time, không theo thứ tự nhập liệu', () => {
    // Truyền ngược thứ tự thời gian (nhập sau nhưng entry_time sớm hơn)
    const executions = [
      exec('newer', '2026-08-09T10:00:00Z'), // gần nhất, theo plan
      exec('older', '2026-08-01T10:00:00Z'),
      exec('middle', '2026-08-05T10:00:00Z'),
    ];
    const followedByExec: Record<string, boolean> = {
      older: true,
      middle: true,
      newer: true,
    };
    // middle bị vi phạm → streak chỉ đếm newer = 1
    const r = computeDisciplineStreak({
      executions,
      followedByExec,
      violatedExecIds: new Set(['middle']),
    });
    expect(r.streak).toBe(1);
  });

  it('vi phạm ở giữa chuỗi → streak đếm từ lệnh gần nhất lùi tới lệnh vi phạm', () => {
    const executions = Array.from({ length: 6 }, (_, i) =>
      exec(`e${i}`, `2026-08-0${i + 1}T10:00:00Z`),
    );
    const followedByExec: Record<string, boolean> = {};
    executions.forEach((e) => (followedByExec[e.id] = true));
    // e2 vi phạm (ở giữa) → streak = e5,e4,e3 = 3
    const r = computeDisciplineStreak({
      executions,
      followedByExec,
      violatedExecIds: new Set(['e2']),
    });
    expect(r.streak).toBe(3);
  });

  it('không có lệnh → streak 0, hasTrades false', () => {
    const r = computeDisciplineStreak({
      executions: [],
      followedByExec: {},
      violatedExecIds: new Set(),
    });
    expect(r.streak).toBe(0);
    expect(r.hasTrades).toBe(false);
  });

  it('lệnh không có delta (followed undefined) → không tính là theo plan, reset nếu ở cuối', () => {
    const executions = [
      exec('a', '2026-08-01T10:00:00Z'), // followed=true
      exec('b', '2026-08-02T10:00:00Z'), // không có delta → không phải theo plan
    ];
    const r = computeDisciplineStreak({
      executions,
      followedByExec: { a: true },
      violatedExecIds: new Set(),
    });
    expect(r.streak).toBe(0); // lệnh gần nhất (b) không đạt điều kiện → reset
  });
});
