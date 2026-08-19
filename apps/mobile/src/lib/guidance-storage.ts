/**
 * guidance-storage.ts — Lưu trạng thái guidance qua AsyncStorage.
 *
 * Quy ước key (fail-open — lỗi AsyncStorage KHÔNG bao giờ chặn luồng UI):
 *  - `guidance.tour.<tourId>.seen`            — tour đã được xem/skip (không hiện lại)
 *  - `guidance.tour.<tourId>.step.<stepId>.completed` — bước đã hoàn thành
 *  - `guidance.feature.<featureKey>.dismissed` — badge feature đã bị đóng
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'guidance.';

const tourSeenKey = (tourId: string) => `${PREFIX}tour.${tourId}.seen`;
const stepKey = (tourId: string, stepId: string) => `${PREFIX}tour.${tourId}.step.${stepId}.completed`;
const featureDismissedKey = (featureKey: string) => `${PREFIX}feature.${featureKey}.dismissed`;

async function readFlag(key: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key)) === '1';
  } catch {
    return false; // fail-open: lỗi đọc → coi như chưa xem (không chặn tính năng)
  }
}

async function writeFlag(key: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, '1');
  } catch {
    // fail-open: lỗi lưu → bỏ qua, không throw (guidance không bao giờ làm crash app)
  }
}

/** Tour đã được xem/skip chưa (dùng cho trigger chỉ-hiện-1-lần). */
export function hasSeenTour(tourId: string): Promise<boolean> {
  return readFlag(tourSeenKey(tourId));
}

/** Đánh dấu tour đã xem/skip → không hiện lại ở lần mở app sau. */
export function setSeenTour(tourId: string): Promise<void> {
  return writeFlag(tourSeenKey(tourId));
}

/** Bước của tour đã hoàn thành chưa (hỗ trợ step nối tiếp + không spam khi lặp lại action). */
export function hasStepCompleted(tourId: string, stepId: string): Promise<boolean> {
  return readFlag(stepKey(tourId, stepId));
}

/** Đánh dấu bước hoàn thành. */
export function setStepCompleted(tourId: string, stepId: string): Promise<void> {
  return writeFlag(stepKey(tourId, stepId));
}

/** Badge feature đã bị dismiss chưa. */
export function hasFeatureDismissed(featureKey: string): Promise<boolean> {
  return readFlag(featureDismissedKey(featureKey));
}

/** Dismiss badge feature → ẩn vĩnh viễn. */
export function setFeatureDismissed(featureKey: string): Promise<void> {
  return writeFlag(featureDismissedKey(featureKey));
}
