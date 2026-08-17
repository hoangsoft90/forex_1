import {
  buildEveningReview,
  buildMorningBrief,
  NotificationContent,
} from '@/lib/notification-content';

/** Kiểm tra nội dung KHÔNG chứa ngôn ngữ phán xét/hù dọa (tone Auditor cân bằng). */
function expectNoJudgement(c: NotificationContent) {
  if (!c.ok) return;
  const text = `${c.title} ${c.body}`.toLowerCase();
  const banned = ['vi phạm rồi', 'lại thua', 'sao bạn', 'tệ quá', 'thất bại', 'bạn không bao giờ', 'dừng lại ngay'];
  for (const b of banned) {
    expect(text).not.toContain(b);
  }
}

describe('Push Notification content (Module 8)', () => {
  describe('Morning brief — AC: nội dung mẫu review thủ công, không tông phán xét (≥5 bộ dữ liệu)', () => {
    it('bộ 1: score 82 + 2 rules → nhắc score + rules, tông trung tính', () => {
      const c = buildMorningBrief({ yesterdayScore: 82, activeRules: ['Rủi ro tối đa 1 lệnh', 'Lỗ tối đa trong ngày'] });
      expect(c.ok).toBe(true);
      if (c.ok) {
        expect(c.body).toContain('82');
        expect(c.body).toContain('Rules hôm nay');
        expect(c.body).toContain('Rủi ro tối đa 1 lệnh');
      }
      expectNoJudgement(c);
    });

    it('bộ 2: score 45 thấp → vẫn tông khích lệ trung tính, không phán xét', () => {
      const c = buildMorningBrief({ yesterdayScore: 45, activeRules: ['Rủi ro tối đa 1 lệnh'] });
      expect(c.ok).toBe(true);
      if (c.ok) expect(c.body).toContain('45');
      expectNoJudgement(c);
    });

    it('bộ 3: chưa có score → khích lệ bắt đầu, không phán xét', () => {
      const c = buildMorningBrief({ yesterdayScore: null, activeRules: [] });
      expect(c.ok).toBe(true);
      if (c.ok) expect(c.body).toContain('Bắt đầu ghi nhận lệnh');
      expectNoJudgement(c);
    });

    it('bộ 4: nhiều rules → chỉ hiển thị 3 đầu (không nhồi nhét)', () => {
      const c = buildMorningBrief({
        yesterdayScore: 70,
        activeRules: ['a', 'b', 'c', 'd', 'e'],
      });
      expect(c.ok).toBe(true);
      if (c.ok) {
        expect(c.body).toContain('a, b, c');
        expect(c.body).not.toContain('d, e');
      }
    });

    it('bộ 5: score 100 hoàn hảo → vẫn khiêm tốn, không tự khen quá mức', () => {
      const c = buildMorningBrief({ yesterdayScore: 100, activeRules: ['Rủi ro tối đa 1 lệnh'] });
      expect(c.ok).toBe(true);
      if (c.ok) expect(c.body).toContain('100');
      expectNoJudgement(c);
    });
  });

  describe('Evening review — AC: không gửi khi không có lệnh đóng trong ngày', () => {
    it('AC: không có lệnh đóng hôm nay → ok:false (không gửi, tránh notification rỗng)', () => {
      const c = buildEveningReview({ hasClosedToday: false, closedCount: 0 });
      expect(c.ok).toBe(false);
      if (!c.ok) expect(c.reason).toBe('no_evening_trades');
    });

    it('có 3 lệnh đóng → nhắc review, tông trung tính-khích lệ', () => {
      const c = buildEveningReview({ hasClosedToday: true, closedCount: 3 });
      expect(c.ok).toBe(true);
      if (c.ok) {
        expect(c.body).toContain('3 lệnh');
        expect(c.body).toContain('không phải phán xét');
      }
      expectNoJudgement(c);
    });

    it('closedCount=0 dù hasClosedToday=true → coi như không có (an toàn)', () => {
      const c = buildEveningReview({ hasClosedToday: true, closedCount: 0 });
      expect(c.ok).toBe(false);
    });
  });
});
