/**
 * Push Notification manager — Retention Layer Module 8 (P1).
 *
 * Opt-in RÕ RÀNG (AC): chỉ hỏi permission SAU khi user đã thấy Today Dashboard
 * ít nhất 1 lần — không hỏi ngay lúc mở app lần đầu.
 *
 * Scheduling: dùng expo-notifications local notifications theo giờ user cấu hình
 * (mặc định 08:00 sáng / 21:00 tối theo timezone user). Evening review chỉ gửi
 * khi có lệnh đóng trong ngày — kiểm tra tại thời điểm schedule/trigger.
 *
 * Lưu ý: đây là local notifications (không cần server push) — đủ cho Phase này.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import i18n from '@/i18n';
import { buildEveningReview } from '@/lib/notification-content';
import { supabase } from '@/lib/supabase';

const HAS_SEEN_DASHBOARD_KEY = 'has_seen_dashboard_v1';
const NOTIF_PERMISSION_ASKED_KEY = 'notif_permission_asked_v1';

/** Đánh dấu user đã thấy Today Dashboard (gọi ở (main)/index). */
export async function markDashboardSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(HAS_SEEN_DASHBOARD_KEY, '1');
  } catch {
    // ignore — không làm hỏng luồng chính
  }
}

/** Đã thấy Dashboard lần nào chưa (điều kiện để hỏi permission). */
export async function hasSeenDashboard(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(HAS_SEEN_DASHBOARD_KEY)) === '1';
  } catch {
    return false;
  }
}

/** Cấu hình handler hiển thị notification khi app foreground. */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Hỏi permission ĐÚNG NGỮ CẢNH: chỉ khi (1) đã thấy Dashboard ≥ 1 lần VÀ
 * (2) chưa từng hỏi. Trả true nếu được cấp.
 */
export async function requestNotificationPermissionIfEligible(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return false; // push notification không áp dụng web
    const seen = await hasSeenDashboard();
    if (!seen) return false;

    const asked = (await AsyncStorage.getItem(NOTIF_PERMISSION_ASKED_KEY)) === '1';
    if (asked) {
      // Đã hỏi rồi — kiểm tra trạng thái hiện tại (không hỏi lại)
      const s = await Notifications.getPermissionsAsync();
      return s.granted;
    }

    await AsyncStorage.setItem(NOTIF_PERMISSION_ASKED_KEY, '1');
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

export type NotificationPrefs = {
  morning_enabled: boolean;
  morning_time: string; // "HH:MM" (24h)
  evening_enabled: boolean;
  evening_time: string; // "HH:MM"
};

const MORNING_ID = 'morning-brief';
const EVENING_ID = 'evening-review';

/** Hủy toàn bộ notification đã lên lịch. */
export async function cancelAllScheduled(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}

/**
 * Lên lịch notification hàng ngày theo giờ cấu hình (nếu bật).
 * Morning: DAILY lặp (nội dung tĩnh).
 * Evening: KHÔNG lặp DAILY — schedule one-shot hôm nay CHỈ KHI có lệnh đóng trong
 * ngày (kiểm tra tại thời điểm schedule), và được re-sync mỗi khi app mở/đóng lệnh
 * (syncEveningNotification). Tránh spam ngày không có lệnh — đúng AC Module 8.
 */
export async function scheduleDailyNotifications(prefs: NotificationPrefs): Promise<void> {
  try {
    await cancelAllScheduled();
    if (Platform.OS === 'web') return;

    if (prefs.morning_enabled) {
      await Notifications.scheduleNotificationAsync({
        identifier: MORNING_ID,
        content: {
          title: i18n.t('notification.morningTitle'),
          body: i18n.t('notification.managerMorningBody'),
        },
        trigger: dailyTrigger(prefs.morning_time),
      });
    }

    if (prefs.evening_enabled) {
      // AC: chỉ gửi khi có lệnh đóng hôm nay — kiểm tra NGAY BÂY GIỜ, không phải lúc save
      await syncEveningNotification(prefs);
    }
  } catch {
    // ignore — notification không được phép làm hỏng luồng chính
  }
}

/** Đếm lệnh đóng trong ngày hôm nay (device-local midnight → so với exit_time UTC). */
async function countClosedToday(): Promise<number> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from('trade_executions')
      .select('id')
      .eq('user_id', user.id)
      .gte('exit_time', startOfDay.toISOString());
    return (data ?? []).length;
  } catch {
    return 0;
  }
}

/**
 * Re-sync evening review: gọi khi app mở (Dashboard) / đóng lệnh (widget, paste-mt4)
 * / save settings. Chỉ schedule one-shot hôm nay nếu CÓ lệnh đóng trong ngày;
 * ngày không có lệnh → hủy (im lặng). One-shot → không bao giờ gửi trùng ngày sau.
 */
export async function syncEveningNotification(prefs?: NotificationPrefs): Promise<void> {
  try {
    if (Platform.OS === 'web') return;
    // Hủy job cũ trước (nếu có) — tránh 2 job cùng ngày sau khi đổi giờ
    await Notifications.cancelScheduledNotificationAsync(EVENING_ID).catch(() => {});

    let p = prefs;
    if (!p) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('notification_preferences')
        .select('evening_review_enabled, evening_review_time')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!data) return;
      p = {
        morning_enabled: true,
        morning_time: '08:00',
        evening_enabled: data.evening_review_enabled !== false,
        evening_time: (data.evening_review_time ?? '21:00').slice(0, 5),
      };
    }
    if (!p.evening_enabled) return;

    const closedCount = await countClosedToday();
    const content = buildEveningReview({ hasClosedToday: closedCount > 0, closedCount });
    if (!content.ok) return; // không có lệnh đóng hôm nay → im lặng

    const trigger = todayOneShot(p.evening_time);
    if (!trigger) return; // giờ evening đã qua hôm nay → không gửi muộn giờ (đợi re-sync ngày mai)

    await Notifications.scheduleNotificationAsync({
      identifier: EVENING_ID,
      content: { title: content.title, body: content.body },
      trigger,
    });
  } catch {
    // ignore — notification không được phép làm hỏng luồng chính
  }
}

/** Trigger lặp lại hàng ngày theo giờ "HH:MM" (24h) — dùng cho morning brief. */
function dailyTrigger(time: string): Notifications.NotificationTriggerInput {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  const hour = Number.isFinite(h) ? h : 8;
  const minute = Number.isFinite(m) ? m : 0;
  return {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
  } as Notifications.NotificationTriggerInput;
}

/**
 * Trigger ONE-SHOT cho hôm nay lúc "HH:MM" (giờ thiết bị).
 * Trả null nếu giờ đã qua hôm nay (không gửi muộn — tránh fire ngay lập tức).
 * One-shot: mỗi ngày chỉ gửi 1 lần nếu có lệnh đóng — re-sync ngày sau qua app mở.
 */
function todayOneShot(time: string): Notifications.NotificationTriggerInput | null {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  const hour = Number.isFinite(h) ? h : 21;
  const minute = Number.isFinite(m) ? m : 0;
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  if (date.getTime() <= Date.now()) return null;
  return {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date,
  } as Notifications.NotificationTriggerInput;
}
