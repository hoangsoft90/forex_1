/**
 * Edge Function: detect-violations — Module 7 (Behavior Engine).
 *
 * Nhận execution vừa đóng, chạy rule-based detection (overconfidence_size,
 * revenge_trading, hope_trading, martingale_negative) và ghi rule_violations
 * KHÔNG duplicate (cùng trade_execution + violation_type).
 *
 * news_gambling: ⚠️ CHƯA IMPLEMENT — cần nguồn Economic Calendar ở Phase 3.
 * Không giả lập dữ liệu tin tức giả.
 *
 * Deploy: supabase functions deploy detect-violations
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OVERCONFIDENCE_RISK_MULTIPLIER = 1.5;
const REVENGE_WINDOW_MINUTES = 10;
const MARTINGALE_LOT_MULTIPLIER = 1.8;
const HOPE_TRADING_MAX_SL_ADJUSTMENTS = 2;

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

    const { executionId } = await req.json();
    if (!executionId) {
      return new Response(JSON.stringify({ error: 'Thiếu executionId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: exec } = await supabase
      .from('trade_executions')
      .select('id, user_id, symbol, direction, lot_size, actual_risk_percent, entry_time, exit_time, trade_plan_id')
      .eq('id', executionId)
      .eq('user_id', user.id)
      .single();
    if (!exec) {
      return new Response(JSON.stringify({ error: 'Không tìm thấy execution' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Plan liên kết
    let plannedRisk: number | null = null;
    if (exec.trade_plan_id) {
      const { data: plan } = await supabase
        .from('trade_plans')
        .select('planned_risk_percent')
        .eq('id', exec.trade_plan_id)
        .maybeSingle();
      plannedRisk = plan?.planned_risk_percent ?? null;
    }

    // Số lần dời SL
    const { count: slCount } = await supabase
      .from('trade_sl_adjustments')
      .select('id', { count: 'exact', head: true })
      .eq('trade_execution_id', exec.id);

    // Lệnh đóng gần nhất TRƯỚC lệnh này (theo entry_time)
    const { data: prevRows } = await supabase
      .from('trade_executions')
      .select('direction, lot_size, pnl_amount, exit_time')
      .eq('user_id', user.id)
      .not('exit_time', 'is', null)
      .lt('entry_time', exec.entry_time)
      .order('entry_time', { ascending: false })
      .limit(1);
    const prev = prevRows?.[0] ?? null;

    const found: { type: string; severity: number; evidence: Record<string, unknown> }[] = [];

    if (plannedRisk != null && exec.actual_risk_percent != null) {
      if (exec.actual_risk_percent > plannedRisk * OVERCONFIDENCE_RISK_MULTIPLIER) {
        found.push({
          type: 'overconfidence_size',
          severity: 3,
          evidence: { actual_risk_percent: exec.actual_risk_percent, planned_risk_percent: plannedRisk },
        });
      }
    }

    if (prev && prev.pnl_amount != null && prev.pnl_amount < 0 && prev.exit_time != null) {
      const gapMin = (new Date(exec.entry_time).getTime() - new Date(prev.exit_time).getTime()) / 60000;
      if (gapMin <= REVENGE_WINDOW_MINUTES && prev.direction !== exec.direction) {
        found.push({
          type: 'revenge_trading',
          severity: 4,
          evidence: { previous_pnl: prev.pnl_amount, gap_minutes: Math.round(gapMin) },
        });
      }
    }

    if ((slCount ?? 0) > HOPE_TRADING_MAX_SL_ADJUSTMENTS) {
      found.push({ type: 'hope_trading', severity: 3, evidence: { sl_adjustments_count: slCount } });
    }

    if (prev && prev.lot_size > 0 && exec.lot_size > prev.lot_size * MARTINGALE_LOT_MULTIPLIER && prev.pnl_amount != null && prev.pnl_amount < 0) {
      found.push({
        type: 'martingale_negative',
        severity: 4,
        evidence: { previous_lot: prev.lot_size, current_lot: exec.lot_size },
      });
    }

    // Ghi violation, KHÔNG duplicate (check trước khi insert)
    let inserted = 0;
    for (const v of found) {
      const { count: existing } = await supabase
        .from('rule_violations')
        .select('id', { count: 'exact', head: true })
        .eq('trade_execution_id', exec.id)
        .eq('violation_type', v.type);
      if ((existing ?? 0) > 0) continue;
      const { error: insertErr } = await supabase.from('rule_violations').insert({
        user_id: user.id,
        trade_execution_id: exec.id,
        violation_type: v.type,
        is_negative: true,
        severity: v.severity,
        evidence_snapshot: v.evidence,
      });
      if (!insertErr) inserted++;
    }

    return new Response(
      JSON.stringify({
        detected: found.map((f) => f.type),
        inserted,
        note: 'news_gambling chưa implement — cần nguồn Economic Calendar ở Phase 3 (không giả lập).',
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
