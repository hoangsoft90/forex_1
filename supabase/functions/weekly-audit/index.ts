/**
 * Edge Function: weekly-audit — Module 9.
 *
 * Sinh báo cáo tuần từ số liệu THẬT bằng template (rule-based, KHÔNG dùng LLM —
 * mvp_scope mục 9). Client cũng có thể tính local qua src/lib/weekly-audit.ts;
 * function này là endpoint để chạy từ cron/backend.
 *
 * Deploy: supabase functions deploy weekly-audit
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VIOLATION_LABELS: Record<string, string> = {
  overconfidence_size: 'vào lệnh quá khối lượng',
  revenge_trading: 'revenge trade',
  hope_trading: 'dời Stop Loss',
  martingale_negative: 'tăng lot sau lệnh thua',
  news_gambling: 'vào lệnh trước tin lớn',
  max_daily_loss_exceeded: 'vượt mức lỗ tối đa trong ngày',
  checklist_skipped: 'bỏ qua checklist',
};

function weekBounds(day: Date): { start: string; end: string } {
  const d = new Date(day);
  const dow = (d.getDay() + 6) % 7;
  const start = new Date(d);
  start.setDate(d.getDate() - dow);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

function generateWeeklyAudit(input: {
  totalTrades: number;
  followedPlanPercent: number;
  topViolation: { type: string; count: number } | null;
  badTradesPrevented: number;
  weekPnl: number;
}): string {
  const parts: string[] = [];
  if (input.totalTrades > 0) {
    parts.push(
      `Tuần này bạn thực hiện ${input.totalTrades} lệnh, ${input.followedPlanPercent.toFixed(0)}% theo đúng plan.`,
    );
  } else {
    parts.push('Tuần này bạn chưa có lệnh nào được ghi nhận.');
    return parts.join(' ');
  }
  if (input.topViolation && input.topViolation.count > 0) {
    const label = VIOLATION_LABELS[input.topViolation.type] ?? input.topViolation.type;
    parts.push(
      input.topViolation.count === 1
        ? `Vi phạm phổ biến nhất: ${label} (1 lần).`
        : `Vi phạm phổ biến nhất: ${label} (${input.topViolation.count} lần).`,
    );
  } else {
    parts.push('Tuần này bạn không có vi phạm nào được ghi nhận — giữ vững nhé.');
  }
  if (input.badTradesPrevented > 0) {
    parts.push(
      `App đã giúp bạn tránh ${input.badTradesPrevented} lệnh vi phạm rule của chính mình.`,
    );
  }
  if (input.weekPnl >= 0) {
    parts.push(`Kết quả tuần: +$${input.weekPnl.toFixed(2)}. Tiếp tục duy trì kỷ luật như thế này.`);
  } else {
    parts.push(
      `Kết quả tuần: -$${Math.abs(input.weekPnl).toFixed(2)}. Nhìn vào % theo plan để phân biệt do chiến lược hay do hành vi.`,
    );
  }
  return parts.join(' ');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser(jwt);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { start, end } = weekBounds(new Date());

    const [{ data: executions }, { data: deltas }, { data: violations }, { data: interruptions }] =
      await Promise.all([
        supabase
          .from('trade_executions')
          .select('trade_plan_id, pnl_amount, exit_time')
          .eq('user_id', user.id)
          .not('exit_time', 'is', null)
          .gte('exit_time', `${start}T00:00:00`)
          .lte('exit_time', `${end}T23:59:59`),
        supabase.from('plan_vs_reality_deltas').select('followed_plan').eq('user_id', user.id),
        supabase
          .from('rule_violations')
          .select('violation_type')
          .eq('user_id', user.id)
          .gte('detected_at', `${start}T00:00:00`)
          .lte('detected_at', `${end}T23:59:59`),
        supabase
          .from('decision_interruptions')
          .select('user_decision')
          .eq('user_id', user.id)
          .in('user_decision', ['cancelled', 'reduced_risk'])
          .gte('responded_at', `${start}T00:00:00`)
          .lte('responded_at', `${end}T23:59:59`),
      ]);

    const execList = (executions ?? []) as { pnl_amount: number | null }[];
    const totalTrades = execList.length;
    const weekPnl = execList.reduce((s, e) => s + (e.pnl_amount ?? 0), 0);
    const followed = (deltas ?? []).filter((d) => d.followed_plan === true).length;
    const totalDelta = (deltas ?? []).length;
    const followedPlanPercent = totalDelta > 0 ? (followed / totalDelta) * 100 : 0;

    const vCounts: Record<string, number> = {};
    for (const v of violations ?? []) vCounts[v.violation_type] = (vCounts[v.violation_type] ?? 0) + 1;
    const topEntry = Object.entries(vCounts).sort((a, b) => b[1] - a[1])[0];
    const topViolation = topEntry ? { type: topEntry[0], count: topEntry[1] } : null;

    const text = generateWeeklyAudit({
      totalTrades,
      followedPlanPercent,
      topViolation,
      badTradesPrevented: interruptions?.length ?? 0,
      weekPnl,
    });

    return new Response(
      JSON.stringify({
        week: { start, end },
        text,
        stats: { totalTrades, followedPlanPercent, topViolation, weekPnl },
        note: 'Rule-based template — không dùng LLM (mvp_scope mục 9).',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: `Lỗi server: ${e instanceof Error ? e.message : e}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
