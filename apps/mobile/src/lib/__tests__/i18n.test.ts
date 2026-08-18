import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import i18n, { changeAppLanguage, resolveInitialLanguage, SUPPORTED_LANGS } from '@/i18n';

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other|male|female|neutral)$/;

function flatten(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    // i18next plural: key_one/key_other ... — chuẩn hóa về key gốc khi so khớp
    const kk = k.replace(PLURAL_SUFFIX, '');
    const p = prefix ? `${prefix}.${kk}` : kk;
    return typeof v === 'string' ? [p] : flatten(v as Record<string, unknown>, p);
  });
}

/** Mock locale tối giản (expo-localization Locale có nhiều field — chỉ cần languageCode). */
function mockLocales(...codes: string[]): void {
  jest.mocked(Localization.getLocales).mockReturnValue(
    codes.map((code) => ({ languageCode: code, languageTag: `${code}-XX` })) as never,
  );
}

describe('i18n — resolveInitialLanguage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockLocales('vi');
    await i18n.changeLanguage('vi');
  });

  it('ưu tiên preference đã lưu (override cả thiết bị)', async () => {
    await AsyncStorage.setItem('app_lang', 'en');
    mockLocales('vi');
    expect(await resolveInitialLanguage()).toBe('en');
  });

  it('không có preference → theo thiết bị nếu khớp ngôn ngữ hỗ trợ', async () => {
    mockLocales('en');
    expect(await resolveInitialLanguage()).toBe('en');
  });

  it('thiết bị không hỗ trợ → fallback vi', async () => {
    mockLocales('fr');
    expect(await resolveInitialLanguage()).toBe('vi');
  });

  it('preference không hợp lệ → bỏ qua, detect thiết bị', async () => {
    await AsyncStorage.setItem('app_lang', 'xx');
    mockLocales('en');
    expect(await resolveInitialLanguage()).toBe('en');
  });
});

describe('i18n — changeAppLanguage + persist', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await i18n.changeLanguage('vi');
  });

  it('changeAppLanguage đổi ngôn ngữ và lưu preference', async () => {
    await changeAppLanguage('en');
    expect(i18n.language).toBe('en');
    expect(await AsyncStorage.getItem('app_lang')).toBe('en');
    expect(i18n.t('common.save')).toBe('Save');
  });

  it('t() theo ngôn ngữ hiện tại (vi mặc định)', async () => {
    expect(i18n.language).toBe('vi');
    expect(i18n.t('common.save')).toBe('Lưu');
  });
});

describe('i18n — fallback không hiện raw key', () => {
  it('ngôn ngữ không hỗ trợ → fallback về vi, không hiện raw key', () => {
    const t = i18n.getFixedT('fr');
    expect(t('common.save')).toBe('Lưu');
  });
});

describe('i18n — so khớp key giữa vi và en (spec: không thiếu/không thừa)', () => {
  it('mọi key của vi đều có trong en và ngược lại', () => {
    const viKeys = new Set(flatten(i18n.getResourceBundle('vi', 'translation')));
    const enKeys = new Set(flatten(i18n.getResourceBundle('en', 'translation')));
    const missingInEn = [...viKeys].filter((k) => !enKeys.has(k));
    const missingInVi = [...enKeys].filter((k) => !viKeys.has(k));
    expect(missingInEn).toEqual([]);
    expect(missingInVi).toEqual([]);
  });

  it('SUPPORTED_LANGS chứa vi + en và mỗi lang có resource bundle', () => {
    expect(SUPPORTED_LANGS).toContain('vi');
    expect(SUPPORTED_LANGS).toContain('en');
    for (const lang of SUPPORTED_LANGS) {
      expect(i18n.getResourceBundle(lang, 'translation')).toBeTruthy();
    }
  });
});
