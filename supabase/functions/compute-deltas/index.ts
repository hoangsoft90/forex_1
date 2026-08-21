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
  // Forex JPY pairs + crosses
  if (['USDJPY','EURJPY','GBPJPY','AUDJPY','NZDJPY','CADJPY','CHFJPY'].includes(symbol)) return 0.01;
  // Commodities & indices with 0.1 pip
  if (['XAUUSD','XPTUSD','XPDUSD','NAS100','SPX500','DE40','AUS200'].includes(symbol)) return 0.1;
  // Crypto
  if (['BTCUSD'].includes(symbol)) return 1;
  if (['ETHUSD','BNBUSD','SOLUSD'].includes(symbol)) return 0.01;
  // Indices with 1 pip
  if (['US30','UK100','JP225','HK33'].includes(symbol)) return 1;
  // Commodities with 0.01 pip
  if (['USOIL','UKOIL'].includes(symbol)) return 0.01;
  // Silver
  if (symbol === 'XAGUSD') return 0.001;
  // Default: standard forex pip
  return 0.0001;
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

// ⚠️ KEEP IN SYNC: helpers khớp `apps/mobile/src/lib/risk-engine.ts`.
function pipValuePerLot(symbol: string, price: number): number | null {
  const pip = pipSizeForSymbol(symbol);
  // Forex majors (quote USD)
  if (['EURUSD','GBPUSD','AUDUSD','NZDUSD'].includes(symbol)) return 100_000 * pip;
  // Forex majors (base USD → inverse)
  if (['USDJPY','USDCAD','USDCHF'].includes(symbol)) return 100_000 * pip / price;
  // JPY crosses (approx USDJPY=150)
  if (['EURJPY','GBPJPY','AUDJPY','NZDJPY','CADJPY','CHFJPY'].includes(symbol)) return 100_000 * pip / 150;
  // GBP crosses (approx GBPUSD=1.27)
  if (['EURGBP'].includes(symbol)) return 100_000 * pip * 1.27;
  // AUD crosses (approx AUDUSD=0.65)
  if (['EURAUD','GBPAUD'].includes(symbol)) return 100_000 * pip * 0.65;
  // NZD crosses (approx NZDUSD=0.60)
  if (['EURNZD'].includes(symbol)) return 100_000 * pip * 0.60;
  // CAD crosses (approx USDCAD=1.35 → 1/1.35=0.74)
  if (['EURCAD','GBPCAD'].includes(symbol)) return 100_000 * pip * 0.74;
  // CHF crosses (approx USDCHF=0.89 → 1/0.89=1.12)
  if (['EURCHF','GBPCHF'].includes(symbol)) return 100_000 * pip * 1.12;
  // Commodities (quote USD)
  if (symbol === 'XAUUSD') return 100 * pip;       // 100 oz
  if (symbol === 'XAGUSD') return 5_000 * pip;     // 5000 oz
  if (['USOIL','UKOIL'].includes(symbol)) return 1_000 * pip;  // 1000 bbl
  if (['XPTUSD','XPDUSD'].includes(symbol)) return 100 * pip;  // 100 oz
  // Indices & Crypto (contract = 1)
  if (['US30','NAS100','SPX500','DE40','UK100','JP225','HK33','AUS200','BTCUSD','ETHUSD','BNBUSD','SOLUSD'].includes(symbol)) return 1 * pip;
  return null;
}

/** actual_risk_percent = (lot × pip × pip value) / balance × 100 — null nếu thiếu dữ liệu. */
function actualRiskPercent(
  lotSize: number,
  symbol: string,
  entry: number,
  sl: number,
  balance: number,
): number | null {
  const pipValue = pipValuePerLot(symbol, entry);
  if (pipValue == null) return null;
  const pips = Math.abs(entry - sl) / pipSizeForSymbol(symbol);
  if (pips <= 0 || balance <= 0 || lotSize <= 0) return null;
  return round(((lotSize * pips * pipValue) / balance) * 100, 4);
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
      .select('id, user_id, symbol, trade_plan_id, lot_size, actual_entry, actual_sl, actual_risk_percent, exit_time')
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

    // P0-A: backfill actual_risk_percent nếu null (lệnh cũ/widget/import thiếu) —
    // tính ngược từ lot + SL + balance rồi cập nhật execution, dùng giá trị mới
    // cho delta. Thiếu SL/balance/symbol không hỗ trợ → giữ null (không suy đoán).
    let actualRisk = exec.actual_risk_percent;
    if (actualRisk == null) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('account_balance_baseline')
        .eq('id', user.id)
        .maybeSingle();
      const balance = (profile?.account_balance_baseline as number | null | undefined) ?? null;
      if (balance != null && balance > 0 && exec.actual_sl != null) {
        actualRisk = actualRiskPercent(exec.lot_size, exec.symbol, exec.actual_entry, exec.actual_sl, balance);
        if (actualRisk != null) {
          await supabase.from('trade_executions').update({ actual_risk_percent: actualRisk }).eq('id', exec.id);
        }
      }
    }

    const riskDeviationPercent = round(
      (actualRisk ?? 0) - (plan?.planned_risk_percent ?? 0),
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

    // Ghi 1 delta / 1 execution. KHÔNG dùng upsert(onConflict) vì bảng
    // plan_vs_reality_deltas KHÔNG có unique constraint trên trade_execution_id
    // (smoke test 2026-08-18 phát hiện upsert luôn fail PGRST102 → pipeline delta
    // chưa từng ghi được dữ liệu). Chọn select → update/insert thay vì đổi schema.
    const { data: existingDelta } = await supabase
      .from('plan_vs_reality_deltas')
      .select('id')
      .eq('trade_execution_id', exec.id)
      .maybeSingle();
    let writeErr: { message: string } | null = null;
    if (existingDelta) {
      ({ error: writeErr } = await supabase
        .from('plan_vs_reality_deltas')
        .update(row)
        .eq('id', existingDelta.id));
    } else {
      ({ error: writeErr } = await supabase.from('plan_vs_reality_deltas').insert(row));
    }
    if (writeErr) throw writeErr;

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
