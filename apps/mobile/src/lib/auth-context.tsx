import { Session, User } from '@supabase/supabase-js';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type OnboardingState = {
  /** User đã có account_balance_baseline chưa */
  hasBalance: boolean;
  /** User đã có weakness_profile chưa */
  hasWeaknessProfile: boolean;
  /** User đã có đủ 2 rule bắt buộc (max_risk_per_trade + max_daily_loss) chưa */
  hasRequiredRules: boolean;
};

type AuthContextValue = {
  /** true khi đang kiểm tra session ban đầu (splash) */
  loading: boolean;
  user: User | null;
  session: Session | null;
  /** Trạng thái onboarding; null nếu chưa login */
  onboarding: OnboardingState | null;
  /** Tier hiện tại ('free' | 'pro') — đọc từ user_profiles */
  tier: string | null;
  /** subscription_expires_at (ISO) — null nếu Free */
  subscriptionExpiresAt: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [tier, setTier] = useState<string | null>(null);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<string | null>(null);

  async function refreshProfile() {
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    if (!u) {
      setOnboarding(null);
      setTier(null);
      setSubscriptionExpiresAt(null);
      return;
    }
    const { data } = await supabase
      .from('user_profiles')
      .select('account_balance_baseline, weakness_profile, subscription_tier, subscription_expires_at')
      .eq('id', u.id)
      .maybeSingle();
    setTier((data?.subscription_tier as string) ?? 'free');
    setSubscriptionExpiresAt((data?.subscription_expires_at as string) ?? null);
    const { count: requiredRuleCount } = await supabase
      .from('trading_rules')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', u.id)
      .eq('is_active', true)
      .in('rule_type', ['max_risk_per_trade', 'max_daily_loss']);
    setOnboarding({
      hasBalance: data?.account_balance_baseline != null,
      hasWeaknessProfile: data?.weakness_profile != null,
      hasRequiredRules: (requiredRuleCount ?? 0) >= 2,
    });
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) await refreshProfile();
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        await refreshProfile();
      } else {
        // Sign-out / mất session: clear toàn bộ state user — tránh tier/expiry cũ
        // hiện vài giây khi đăng nhập tài khoản khác (bug review 2026-08-17).
        setOnboarding(null);
        setTier(null);
        setSubscriptionExpiresAt(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        loading,
        user,
        session,
        onboarding,
        tier,
        subscriptionExpiresAt,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải được dùng bên trong <AuthProvider>');
  return ctx;
}
