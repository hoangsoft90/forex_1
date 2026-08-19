/**
 * Edge Function: unlock-pro — Phase 2 (AdMob rewarded → Pro 24h).
 *
 * Trước đây client tự ghi `user_profiles.subscription_tier='pro'` sau khi xem ad,
 * cooldown 5 phút chỉ nằm client-side (AsyncStorage) → user đổi giờ máy
 * (System Clock Attack) là qua được cooldown, xem ad liên tục cộng dồn Pro.
 *
 * Fix (P1-5): mọi việc chuyển vào đây — server kiểm tra cooldown theo
 * `pro_unlocks.granted_at` với ĐỒNG HỒ SERVER (now()), không tin clock thiết bị:
 *   1. Tìm lần unlock admob_rewarded gần nhất → nếu < AD_REWARD_COOLDOWN_MS
 *      (5 phút) → 429, kèm remainingMs để UI đếm ngược.
 *   2. Upsert profile tier='pro' + expires = now+24h (chỉ TĂNG hạn, không rút ngắn).
 *   3. Insert pro_unlocks (method='admob_rewarded') để audit.
 *
 * Lưu ý: AdMob reward server-side verification (SSV) chưa cấu hình — giả định
 * client gọi sau khi onRewarded thật. Không tự giả lập verify.
 *
 * Deploy: supabase functions deploy unlock-pro
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AD_REWARD_COOLDOWN_MS = 5 * 60 * 1000; // phải khớp ad-cooldown.ts client
const PRO_DURATION_MS = 24 * 60 * 60 * 1000;

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

    const now = Date.now();

    // 1. Cooldown server-side (P1-5): dùng giờ server, không tin clock thiết bị.
    const { data: lastUnlock } = await supabase
      .from('pro_unlocks')
      .select('granted_at')
      .eq('user_id', user.id)
      .eq('method', 'admob_rewarded')
      .order('granted_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastUnlock?.granted_at) {
      const lastAt = new Date(lastUnlock.granted_at as string).getTime();
      const elapsed = now - lastAt;
      if (elapsed < AD_REWARD_COOLDOWN_MS) {
        return new Response(
          JSON.stringify({
            ok: false,
            reason: 'cooldown',
            remainingMs: AD_REWARD_COOLDOWN_MS - elapsed,
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
    }

    // 2. Grant Pro 24h — chỉ TĂNG hạn nếu đang Pro và hạn hiện tại xa hơn.
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('subscription_tier, subscription_expires_at')
      .eq('id', user.id)
      .maybeSingle();
    const expiresAt = new Date(now + PRO_DURATION_MS).toISOString();
    const currentExpiry = profile?.subscription_expires_at
      ? new Date(profile.subscription_expires_at as string).getTime()
      : 0;
    const finalExpiry =
      profile?.subscription_tier === 'pro' && currentExpiry > now + PRO_DURATION_MS
        ? (profile.subscription_expires_at as string)
        : expiresAt;

    const { error: upsertErr } = await supabase.from('user_profiles').upsert(
      {
        id: user.id,
        subscription_tier: 'pro',
        subscription_expires_at: finalExpiry,
      },
      { onConflict: 'id' },
    );
    if (upsertErr) {
      return new Response(
        JSON.stringify({ error: `Lỗi lưu Pro: ${upsertErr.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 3. Audit — thất bại không rollback quyền Pro.
    const { error: unlockErr } = await supabase.from('pro_unlocks').insert({
      user_id: user.id,
      granted_until: finalExpiry,
      method: 'admob_rewarded',
    });
    if (unlockErr) {
      console.warn('pro_unlocks insert thất bại (không ảnh hưởng quyền Pro):', unlockErr.message);
    }

    return new Response(
      JSON.stringify({ ok: true, expiresAt: finalExpiry }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: `Lỗi server: ${e instanceof Error ? e.message : e}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
