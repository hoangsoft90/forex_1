import {
  canAddRule,
  FREE_MAX_RULES,
  getTemplate,
  hasRequiredRules,
  REQUIRED_RULE_TYPES,
  RULE_TEMPLATES,
} from '../trading-rules';

describe('trading-rules', () => {
  it('có 2 rule bắt buộc: max_risk_per_trade và max_daily_loss', () => {
    expect(REQUIRED_RULE_TYPES).toContain('max_risk_per_trade');
    expect(REQUIRED_RULE_TYPES).toContain('max_daily_loss');
    expect(REQUIRED_RULE_TYPES.length).toBe(2);
  });

  it('2 rule bắt buộc có default đúng mvp_scope (1% và 3%)', () => {
    expect(getTemplate('max_risk_per_trade').default_value).toBe(1);
    expect(getTemplate('max_risk_per_trade').unit).toBe('percent');
    expect(getTemplate('max_daily_loss').default_value).toBe(3);
    expect(getTemplate('max_daily_loss').unit).toBe('percent');
  });

  it('template có đủ rule tùy chọn theo mvp_scope', () => {
    const optional = RULE_TEMPLATES.filter((t) => !t.required).map((t) => t.rule_type);
    expect(optional).toEqual(
      expect.arrayContaining([
        'no_revenge_trade',
        'no_trade_before_news',
        'max_open_positions',
      ]),
    );
  });

  it('hasRequiredRules đúng khi thiếu/đủ', () => {
    expect(hasRequiredRules(['max_risk_per_trade'])).toBe(false);
    expect(
      hasRequiredRules(['max_risk_per_trade', 'max_daily_loss']),
    ).toBe(true);
    expect(
      hasRequiredRules(['max_risk_per_trade', 'max_daily_loss', 'custom']),
    ).toBe(true);
  });

  it('giới hạn Free = 3 rules, Pro không giới hạn', () => {
    expect(FREE_MAX_RULES).toBe(3);
    // Free: 3 active rules → không thêm được nữa
    expect(canAddRule(3, 'free')).toBe(false);
    expect(canAddRule(2, 'free')).toBe(true);
    // Pro: luôn được thêm
    expect(canAddRule(100, 'pro')).toBe(true);
  });
});
