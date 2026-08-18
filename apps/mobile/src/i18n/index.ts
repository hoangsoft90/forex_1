/**
 * i18n — đa ngôn ngữ (đợt này: vi + en; kiến trúc mở rộng được).
 *
 * - Pure lib (`src/lib/*.ts`) dùng `i18next.t(key)` trực tiếp (import từ '@/i18n')
 *   — KHÔNG đổi signature hàm, test cũ (mặc định vi) vẫn pass.
 * - Màn hình dùng `useTranslation()` từ react-i18next (tự re-render khi đổi ngôn ngữ).
 * - Thêm ngôn ngữ mới: thêm vào SUPPORTED_LANGS + LANG_NAMES + file locales/<lang>.json.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n, { changeLanguage as i18nextChangeLanguage, use as i18nextUse } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import vi from './locales/vi.json';

export const SUPPORTED_LANGS = ['vi', 'en'] as const;
export type AppLang = (typeof SUPPORTED_LANGS)[number];

export const LANG_NAMES: Record<AppLang, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
};

const STORAGE_KEY = 'app_lang';

export function isSupportedLang(lang: string | null | undefined): lang is AppLang {
  return !!lang && (SUPPORTED_LANGS as readonly string[]).includes(lang);
}

i18nextUse(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
  },
  lng: 'vi',
  fallbackLng: 'vi',
  returnNull: false,
  interpolation: { escapeValue: false },
});

/**
 * Ngôn ngữ khởi động: preference đã lưu (nếu có) → detect thiết bị → fallback 'vi'.
 */
export async function resolveInitialLanguage(): Promise<AppLang> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (isSupportedLang(saved)) return saved;
  } catch {
    // AsyncStorage lỗi → bỏ qua, detect thiết bị
  }
  try {
    const device = Localization.getLocales()[0]?.languageCode ?? null;
    if (isSupportedLang(device)) return device;
  } catch {
    // expo-localization lỗi → fallback
  }
  return 'vi';
}

/** Đổi ngôn ngữ + lưu preference (lỗi lưu không chặn — vẫn đổi trong phiên này). */
export async function changeAppLanguage(lang: AppLang): Promise<void> {
  await i18nextChangeLanguage(lang);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // fail-open: preference không lưu được, ngôn ngữ vẫn đổi trong phiên hiện tại
  }
}

export default i18n;
