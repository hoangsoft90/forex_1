// Mock AsyncStorage in-memory — tránh NativeModule null khi test lib import supabase.
// Tên biến phải bắt đầu bằng "mock" để jest.mock factory được phép tham chiếu.
const mockStore = new Map();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key) => (mockStore.has(key) ? mockStore.get(key) : null)),
    setItem: jest.fn(async (key, value) => {
      mockStore.set(key, String(value));
    }),
    removeItem: jest.fn(async (key) => {
      mockStore.delete(key);
    }),
    clear: jest.fn(async () => {
      mockStore.clear();
    }),
  },
}));

// expo-localization: mock ổn định cho test (i18n detect locale)
jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'vi', languageTag: 'vi-VN' }]),
}));

// Khởi tạo i18n (lng mặc định 'vi') — mọi component dùng useTranslation()
// trong test đều lấy được translation thật thay vì raw key.
require('@/i18n');
