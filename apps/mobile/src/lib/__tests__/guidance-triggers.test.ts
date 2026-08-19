import { shouldShowBadge, shouldStartTour } from '@/lib/guidance-triggers';

describe('shouldStartTour — chỉ hiện 1 lần, không spam', () => {
  it('đã xem tour → không hiện lại (kể cả user mới)', () => {
    expect(shouldStartTour({ seen: true, isNewUser: true })).toBe(false);
    expect(shouldStartTour({ seen: true, isNewUser: false, newUsersOnly: true })).toBe(false);
  });

  it('user mới chưa xem → hiện', () => {
    expect(shouldStartTour({ seen: false, isNewUser: true })).toBe(true);
    expect(shouldStartTour({ seen: false, isNewUser: true, newUsersOnly: true })).toBe(true);
  });

  it('tour chỉ dành user mới (newUsersOnly) + user không mới → không hiện', () => {
    expect(shouldStartTour({ seen: false, isNewUser: false, newUsersOnly: true })).toBe(false);
  });

  it('tour mở cho mọi user (không newUsersOnly) → user cũ chưa xem vẫn hiện', () => {
    expect(shouldStartTour({ seen: false, isNewUser: false, newUsersOnly: false })).toBe(true);
    expect(shouldStartTour({ seen: false, isNewUser: false })).toBe(true); // mặc định không giới hạn
  });
});

describe('shouldShowBadge', () => {
  it('chưa dismiss → hiện', () => {
    expect(shouldShowBadge(false)).toBe(true);
  });

  it('đã dismiss → ẩn', () => {
    expect(shouldShowBadge(true)).toBe(false);
  });
});
