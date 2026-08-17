/**
 * Edge Function: compute-deltas — Module 6 (Plan vs Reality).
 *
 * Nhận execution vừa đóng (exit_time set), tìm plan liên kết, tính delta
 * (entry/sl/risk deviation + followed_plan) và lưu vào plan_vs_reality_deltas.
 *
 * Cách dùng: client gọi sau khi lưu execution có exit_time (hoặc cron).
 * Ngưỡng followed_plan hardcode Phase 1: entry < 5 pip, risk < 0.2%, không SL adjustment.
 *
 * Deploy: supabase functions deploy compute-deltas
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ENTRY_DEVIATION_MAX_PIPS = 5;
const RISK_DEVIATION_MAX_PERCENT = 0.2;

function pipSizeForSymbol(symbol: string): number {
  if (symbol === 'USDJPY') return 0.01;
  if (symbol === 'XAUUSD') return 0.1;
  return 0.0001;
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
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

    const { executionId } = await req.json();
    if (!executionId) {
      return new Response(JSON.stringify({ error: 'Thiếu executionId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Lấy execution + plan liên kết
    const { data: exec, error: execErr } = await supabase
      .from('trade_executions')
      .select('id, user_id, symbol, trade_plan_id, actual_entry, actual_sl, actual_risk_percent, exit_time')
      .eq('id', executionId)
      .eq('user_id', user.id)
      .single();
    if (execErr || !exec) {
      return new Response(JSON.stringify({ error: 'Không tìm thấy execution' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!exec.exit_time || !exec.trade_plan_id) {
      return new Response(
        JSON.stringify({ error: 'Execution chưa đóng hoặc không có plan (không tính delta)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: plan } = await supabase
      .from('trade_plans')
      .select('id, planned_entry, planned_sl, planned_risk_percent')
      .eq('id', exec.trade_plan_id)
      .single();

    // SL cuối cùng từ trade_sl_adjustments (nếu có)
    const { data: adjustments, error: adjErr } = await supabase
      .from('trade_sl_adjustments')
      .select('new_sl')
      .eq('trade_execution_id', exec.id)
      .order('adjusted_at', { ascending: true });
    if (adjErr) throw adjErr;
    const slAdjustmentCount = adjustments?.length ?? 0;
    const lastAdjustment = adjustments?.length ? adjustments[adjustments.length - 1] : null;

    const pip = pipSizeForSymbol(exec.symbol);
    const entryDeviationPips = round(
      Math.abs(exec.actual_entry - (plan?.planned_entry ?? exec.actual_entry)) / pip,
      2,
    );
    const actualSl = lastAdjustment?.new_sl ?? exec.actual_sl ?? 0;
    const slDeviationPips = round(
      Math.abs(actualSl - (plan?.planned_sl ?? actualSl)) / pip,
      2,
    );
    const riskDeviationPercent = round(
      (exec.actual_risk_percent ?? 0) - (plan?.planned_risk_percent ?? 0),
      4,
    );

    const followedPlan =
      entryDeviationPips < ENTRY_DEVIATION_MAX_PIPS &&
      Math.abs(riskDeviationPercent) < RISK_DEVIATION_MAX_PERCENT &&
      slAdjustmentCount === 0;

    const row = {
      user_id: user.id,
      trade_plan_id: exec.trade_plan_id,
      trade_execution_id: exec.id,
      entry_deviation_pips: entryDeviationPips,
      sl_deviation_pips: slDeviationPips,
      risk_deviation_percent: riskDeviationPercent,
      followed_plan: followedPlan,
      computed_at: new Date().toISOString(),
    };

    // Upsert theo execution (1 execution = 1 delta)
    const { error: upsertErr } = await supabase
      .from('plan_vs_reality_deltas')
      .upsert(row, { onConflict: 'trade_execution_id' });
    if (upsertErr) throw upsertErr;

    return new Response(JSON.stringify({ ok: true, ...row }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: `Lỗi server: ${e instanceof Error ? e.message : e}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
