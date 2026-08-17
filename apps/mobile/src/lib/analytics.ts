import { supabase } from '@/lib/supabase';

/**
 * Ghi 1 event vào bảng `analytics_events` (bổ sung theo yêu cầu user).
 * Dùng để đo acceptance criteria: onboarding ≤ 3 phút, widget ≤ 20 giây.
 *
 * - onboarding_started / onboarding_completed → chênh lệch timestamp đo thời gian onboarding
 * - execution_widget_opened / execution_saved → đo thời gian widget (module 5)
 */
export async function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from('analytics_events').insert({
      user_id: user?.id ?? null,
      event_name: eventName,
      properties: properties ?? null,
    });
  } catch (e) {
    // Analytics không được phép làm hỏng luồng chính — chỉ log, không throw.
    console.warn(`[analytics] Không ghi được event "${eventName}":`, e);
  }
}

/** Event chuẩn cho onboarding (module 1). */
export const ONBOARDING_EVENTS = {
  STARTED: 'onboarding_started',
  COMPLETED: 'onboarding_completed',
} as const;

/** Event chuẩn cho Execution Capture widget (module 5). */
export const EXECUTION_EVENTS = {
  WIDGET_OPENED: 'execution_widget_opened',
  SAVED: 'execution_saved',
} as const;
