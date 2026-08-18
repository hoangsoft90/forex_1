/**
 * Personal Trading Constitution — Module 2.
 *
 * 2 rule BẮT BUỘC (template, user chỉ điền số):
 *   - max_risk_per_trade (gợi ý 1%)
 *   - max_daily_loss (gợi ý 3%)
 * Rule tùy chọn: no_revenge_trade, no_trade_before_news, max_open_positions.
 *
 * Giới hạn theo tier (mục 12 plan v2): Free = tối đa 3 rules, Pro = không giới hạn.
 * Lịch sử thay đổi theo dõi qua `updated_at` (Phase 1 không cần bảng version riêng).
 */

export type TradingRuleType =
  | 'max_risk_per_trade'
  | 'max_daily_loss'
  | 'max_weekly_loss'
  | 'no_revenge_trade'
  | 'no_trade_before_news'
  | 'max_open_positions'
  | 'custom';

export type TradingRuleUnit = 'percent' | 'currency' | 'minutes' | 'count';

export type TradingRuleInput = {
  rule_type: TradingRuleType;
  base_value: number;
  unit: TradingRuleUnit | null;
  is_active: boolean;
};

export type RuleTemplate = {
  rule_type: TradingRuleType;
  /** i18n key — nhãn hiển thị (dịch khi render) */
  label: string;
  /** i18n key — mô tả ngắn */
  description: string;
  /** Giá trị gợi ý mặc định */
  default_value: number;
  unit: TradingRuleUnit;
  /** Rule bắt buộc (không thể xóa, bắt buộc có) */
  required: boolean;
};

/** Template có sẵn — 2 rule bắt buộc + 4 tùy chọn (theo mvp_scope mục 2). */
export const RULE_TEMPLATES: RuleTemplate[] = [
  {
    rule_type: 'max_risk_per_trade',
    label: 'ruleTemplate.maxRiskPerTrade',
    description: 'ruleTemplate.maxRiskPerTradeDesc',
    default_value: 1,
    unit: 'percent',
    required: true,
  },
  {
    rule_type: 'max_daily_loss',
    label: 'ruleTemplate.maxDailyLoss',
    description: 'ruleTemplate.maxDailyLossDesc',
    default_value: 3,
    unit: 'percent',
    required: true,
  },
  {
    rule_type: 'no_revenge_trade',
    label: 'ruleTemplate.noRevengeTrade',
    description: 'ruleTemplate.noRevengeTradeDesc',
    default_value: 10,
    unit: 'minutes',
    required: false,
  },
  {
    rule_type: 'no_trade_before_news',
    label: 'ruleTemplate.noTradeBeforeNews',
    description: 'ruleTemplate.noTradeBeforeNewsDesc',
    default_value: 15,
    unit: 'minutes',
    required: false,
  },
  {
    rule_type: 'max_open_positions',
    label: 'ruleTemplate.maxOpenPositions',
    description: 'ruleTemplate.maxOpenPositionsDesc',
    default_value: 3,
    unit: 'count',
    required: false,
  },
];

/** Số rule tối đa cho Free tier (mục 12 plan v2). */
export const FREE_MAX_RULES = 3;

/** Kiểm tra giới hạn tier khi tạo rule mới. */
export function canAddRule(currentActiveCount: number, tier: string): boolean {
  if (tier === 'pro') return true;
  return currentActiveCount < FREE_MAX_RULES;
}

/** Danh sách rule bắt buộc (không thể thiếu để đi tiếp sang Trade Plan). */
export const REQUIRED_RULE_TYPES: TradingRuleType[] = ['max_risk_per_trade', 'max_daily_loss'];

/** Kiểm tra user đã có đủ 2 rule bắt buộc chưa. */
export function hasRequiredRules(activeRuleTypes: TradingRuleType[]): boolean {
  return REQUIRED_RULE_TYPES.every((t) => activeRuleTypes.includes(t));
}

/** Lấy template theo rule_type (throw nếu không có). */
export function getTemplate(ruleType: TradingRuleType): RuleTemplate {
  const t = RULE_TEMPLATES.find((x) => x.rule_type === ruleType);
  if (!t) throw new Error(`Không có template cho rule "${ruleType}"`);
  return t;
}
