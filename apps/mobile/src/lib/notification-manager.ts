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
 * Lên lịch 2 notification hàng ngày theo giờ cấu hình (nếu bật).
 * Evening: vẫn lên lịch — nhưng nội dung sẽ được xác định lúc chạy qua handler
 * kiểm tra dữ liệu trong ngày (xem buildEveningReview).
 */
export async function scheduleDailyNotifications(
  prefs: NotificationPrefs,
  hasClosedToday: boolean,
): Promise<void> {
  try {
    await cancelAllScheduled();
    if (Platform.OS === 'web') return;

    if (prefs.morning_enabled) {
      await Notifications.scheduleNotificationAsync({
        identifier: MORNING_ID,
        content: {
          title: 'Chúc một ngày giao dịch tốt lành',
          body: 'Mở app để xem Discipline Score và rules hôm nay.',
        },
        trigger: dailyTrigger(prefs.morning_time),
      });
    }

    if (prefs.evening_enabled) {
      // AC: không gửi cuối ngày nếu không có lệnh đóng — nội dung được xác định lúc trigger
      const content = hasClosedToday
        ? {
            title: 'Xem lại hôm nay',
            body: 'Bạn có lệnh đóng hôm nay. Dành 1 phút review — thông tin, không phán xét.',
          }
        : null;
      if (content) {
        await Notifications.scheduleNotificationAsync({
          identifier: EVENING_ID,
          content,
          trigger: dailyTrigger(prefs.evening_time),
        });
      }
    }
  } catch {
    // ignore — notification không được phép làm hỏng luồng chính
  }
}

/** Trigger lặp lại hàng ngày theo giờ "HH:MM" (24h). */
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
