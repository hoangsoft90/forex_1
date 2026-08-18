/**
 * Nội dung động theo ngôn ngữ EN — verify các lib sinh text tiếng Anh đúng
 * khi i18n đang ở `en` (jest mặc định vi → phải chuyển lng rồi trả về).
 */
import i18n from '@/i18n';
import { generateWeeklyAudit } from '@/lib/weekly-audit';
import { buildMorningBrief, buildEveningReview } from '@/lib/notification-content';
import { COST_DISCLAIMER } from '@/lib/cost-of-indiscipline';
import { COHORT_BENCHMARKS } from '@/lib/interruption';
import { formatInstantAudit, InstantAuditResult } from '@/lib/instant-audit';
import { formatHoursLeft } from '@/lib/tier';

describe('i18n content — English (en)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });
  afterEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('weekly audit sinh tiếng Anh', () => {
    const text = generateWeeklyAudit({
      totalTrades: 10,
      followedPlanPercent: 80,
      topViolation: { type: 'hope_trading', count: 2 },
      badTradesPrevented: 3,
      weekPnl: 150,
    });
    expect(text).toContain('10 trades');
    expect(text).toContain('80%');
    expect(text).toContain('moving the Stop Loss');
    expect(text).toContain('avoid 3 trades');
    expect(text).toContain('+$150.00');
    // Không lẫn tiếng Việt
    expect(text).not.toContain('lệnh');
    expect(text).not.toContain('Tuần này');
  });

  it('morning brief sinh tiếng Anh', () => {
    const c = buildMorningBrief({ yesterdayScore: 82, activeRules: ['Max risk per trade'] });
    if (c.ok) {
      expect(c.title).toContain('great trading day');
      expect(c.body).toContain('82');
      expect(c.body).toContain('Today');
    } else {
      throw new Error('expected ok');
    }
  });

  it('evening review sinh tiếng Anh', () => {
    const c = buildEveningReview({ hasClosedToday: true, closedCount: 3 });
    if (c.ok) {
      expect(c.body).toContain('3 trades');
      expect(c.body).toContain('review');
    } else {
      throw new Error('expected ok');
    }
  });

  it('cost disclaimer tiếng Anh — không lẫn tiếng Việt', () => {
    const d = COST_DISCLAIMER();
    expect(d).toContain('hypothetical estimate');
    expect(d).not.toContain('ước tính giả định');
  });

  it('interruption cohort benchmark tiếng Anh', () => {
    expect(COHORT_BENCHMARKS.revenge_pattern()).toContain('73%');
    expect(COHORT_BENCHMARKS.over_risk()).toContain('risk limit');
    expect(COHORT_BENCHMARKS.max_daily_loss()).toContain('daily loss');
  });

  it('instant audit format tiếng Anh', () => {
    const result: InstantAuditResult = {
      totalTrades: 12,
      violations: {
        revenge_trading: { count: 2, estimatedCost: 45 },
      },
    };
    const text = formatInstantAudit(result);
    expect(text).toContain('12 trades');
    expect(text).toContain('revenge traded');
    expect(text).toContain('$45.00');
  });

  it('formatHoursLeft tiếng Anh', () => {
    expect(formatHoursLeft(2.5)).toContain('hours');
    expect(formatHoursLeft(null)).toContain('expired');
  });
});
