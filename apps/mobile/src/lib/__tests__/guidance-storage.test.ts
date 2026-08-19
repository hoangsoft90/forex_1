import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  hasFeatureDismissed,
  hasSeenTour,
  hasStepCompleted,
  setFeatureDismissed,
  setSeenTour,
  setStepCompleted,
} from '@/lib/guidance-storage';

describe('guidance-storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('tour seen round-trip: false → true', async () => {
    expect(await hasSeenTour('welcome')).toBe(false);
    await setSeenTour('welcome');
    expect(await hasSeenTour('welcome')).toBe(true);
  });

  it('stepCompleted round-trip + tách biệt theo step', async () => {
    expect(await hasStepCompleted('welcome', 'step1')).toBe(false);
    await setStepCompleted('welcome', 'step1');
    expect(await hasStepCompleted('welcome', 'step1')).toBe(true);
    expect(await hasStepCompleted('welcome', 'step2')).toBe(false); // không lẫn step khác
  });

  it('feature dismissed round-trip', async () => {
    expect(await hasFeatureDismissed('settings.language')).toBe(false);
    await setFeatureDismissed('settings.language');
    expect(await hasFeatureDismissed('settings.language')).toBe(true);
  });

  it('fail-open: AsyncStorage lỗi → false, không throw', async () => {
    const getSpy = jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('storage down'));
    await expect(hasSeenTour('welcome')).resolves.toBe(false);
    getSpy.mockRestore();

    const setSpy = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('storage down'));
    await expect(setSeenTour('welcome')).resolves.toBeUndefined(); // fail-open, không throw
    setSpy.mockRestore();
  });
});
