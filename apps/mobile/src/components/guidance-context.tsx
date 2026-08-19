/**
 * guidance-context.tsx — GuidanceProvider + useGuidance() (In-app Guidance & Onboarding).
 *
 * Chịu trách nhiệm (state management tập trung, không nằm rải rác ở màn hình):
 *  - Đăng ký element target: màn hình gọi `registerTarget('key')` để lấy ref,
 *    gắn vào element cần highlight → provider đo rect khi tour chạy.
 *  - Tour nhiều bước: `startTour(tourId, steps, opts)` — kiểm tra trigger show-once
 *    (`hasSeenTour` + `shouldStartTour`), điều hướng next/skip, đánh dấu
 *    `stepCompleted` từng bước + `setSeenTour` khi xong/skip.
 *  - Overlay spotlight + tooltip: render ở root (cuối provider) → phủ toàn màn hình,
 *    không phụ thuộc vị trí render của element trong ScrollView.
 *  - Standalone tooltip (DisabledStateHelper): `showDisabledHelper(ref, reason, unlock)`.
 *
 * Provider PHẢI nằm TRÊN Stack (root layout) để overlay phủ mọi màn hình.
 */
import {
  createContext,
  ReactNode,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';

import { measureNode, Placement, Rect } from '@/lib/guidance-position';
import {
  hasSeenTour,
  setFeatureDismissed,
  setSeenTour,
  setStepCompleted,
} from '@/lib/guidance-storage';
import { shouldStartTour } from '@/lib/guidance-triggers';

import SpotlightOverlay from './spotlight-overlay';
import Tooltip from './tooltip';

export type GuidanceStep = {
  /** ID ổn định — lưu vào AsyncStorage (`stepCompleted`) để không spam khi lặp lại action. */
  id: string;
  /** Key element target — phải được đăng ký qua `registerTarget(key)`. */
  targetKey: string;
  title: string;
  body: string;
  placement?: Placement;
};

export type StartTourOptions = {
  tourId: string;
  steps: GuidanceStep[];
  /** Tour chỉ dành user mới (mặc định true — Dashboard truyền `isNewUser` thật). */
  newUsersOnly?: boolean;
  /** User hiện tại có phải "mới" không — caller tự xác định (vd chưa có lệnh/score). */
  isNewUser?: boolean;
};

type TourState = {
  tourId: string;
  steps: GuidanceStep[];
  stepIndex: number;
} | null;

type StandaloneTooltip = {
  rect: Rect;
  title: string;
  body: string;
  placement?: Placement;
} | null;

type GuidanceContextValue = {
  /** Lấy ref (ổn định theo key) để gắn vào element target. */
  registerTarget: (key: string) => RefObject<View | null>;
  /** Khởi động tour — tự check show-once, nếu không đủ điều kiện → no-op. */
  startTour: (opts: StartTourOptions) => Promise<void>;
  /** Bước tiếp theo / hoàn thành step cuối (mark stepCompleted + seen). */
  next: () => void;
  /** Bỏ qua toàn bộ tour (mark seen → không hiện lại). */
  skip: () => void;
  /** Dismiss badge feature (FeatureBadge) → ẩn vĩnh viễn. */
  dismissFeature: (featureKey: string) => Promise<void>;
  /** Hiện tooltip standalone (DisabledStateHelper) tại rect đo từ ref. */
  showDisabledHelper: (opts: { ref: RefObject<View | null>; title: string; body: string; placement?: Placement }) => Promise<void>;
  /** Đóng tooltip standalone (tap ngoài / nút đóng). */
  hideStandalone: () => void;
  /** Tour đang hiển thị không (màn hình dùng để tránh chồng overlay). */
  isTourActive: boolean;
};

const GuidanceContext = createContext<GuidanceContextValue | null>(null);

export function GuidanceProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const screen = useWindowDimensions();
  const { width, height } = screen;

  // Ref của element target — key ổn định, node có thể đổi (remount) khi re-render
  const targetsRef = useRef<Map<string, RefObject<View | null>>>(new Map());
  const [tour, setTour] = useState<TourState>(null);
  // Rect đo được của step HIỆN TẠI — key theo tour+step để overlay không hiện rect cũ của step khác
  const [measured, setMeasured] = useState<{ stepKey: string; rect: Rect } | null>(null);
  const [standalone, setStandalone] = useState<StandaloneTooltip>(null);

  /** Đăng ký ref element target — trả cùng 1 RefObject cho cùng key (identity ổn định). */
  const registerTarget = useCallback((key: string): RefObject<View | null> => {
    let ref = targetsRef.current.get(key);
    if (!ref) {
      ref = { current: null };
      targetsRef.current.set(key, ref);
    }
    return ref;
  }, []);

  /** Đo rect (window coords) của element target theo key — null nếu chưa mount/không đo được. */
  const measureTarget = useCallback(async (key: string): Promise<Rect | null> => {
    const ref = targetsRef.current.get(key);
    return measureNode(ref?.current ?? null);
  }, []);

  /**
   * Khởi động tour.
   * Trigger show-once: đã xem/skip tour này (`hasSeenTour`) HOẶC tour chỉ dành
   * user mới nhưng user không mới → KHÔNG hiện (không spam).
   */
  const startTour = useCallback(
    async (opts: StartTourOptions) => {
      const seen = await hasSeenTour(opts.tourId);
      if (!shouldStartTour({ seen, newUsersOnly: opts.newUsersOnly, isNewUser: opts.isNewUser })) return;
      setTour({
        tourId: opts.tourId,
        steps: opts.steps,
        stepIndex: 0,
      });
    },
    [],
  );

  /** Đánh dấu tour đã xem (chỉ 1 lần) — chạy khi done/skip. */
  const markSeen = useCallback(async (tourId: string) => {
    try {
      await setSeenTour(tourId);
    } catch {
      // fail-open: lỗi lưu không chặn luồng (tour đã kết thúc trong phiên này)
    }
  }, []);

  const finishTour = useCallback(async (tourId: string) => {
    setTour(null);
    await markSeen(tourId);
  }, [markSeen]);

  /** Bước tiếp theo; bước cuối → coi như done (mark seen). */
  const next = useCallback(() => {
    if (!tour) return;
    const step = tour.steps[tour.stepIndex];
    if (step) void setStepCompleted(tour.tourId, step.id).catch(() => {});
    if (tour.stepIndex + 1 >= tour.steps.length) {
      // Bước cuối → done: mark seen + đóng tour
      void finishTour(tour.tourId);
    } else {
      setTour({ ...tour, stepIndex: tour.stepIndex + 1 });
    }
  }, [tour, finishTour]);

  /** Skip toàn bộ tour — mark seen (không spam lần sau) + đóng. */
  const skip = useCallback(() => {
    if (!tour) return;
    void finishTour(tour.tourId);
  }, [tour, finishTour]);

  /** Dismiss badge feature → ẩn vĩnh viễn. */
  const dismissFeature = useCallback(async (featureKey: string) => {
    try {
      await setFeatureDismissed(featureKey);
    } catch {
      // fail-open
    }
  }, []);

  /** DisabledStateHelper: đo rect nút disabled → hiện tooltip standalone giải thích lý do + unlock. */
  const showDisabledHelper = useCallback(
    async ({ ref, title, body, placement }: { ref: RefObject<View | null>; title: string; body: string; placement?: Placement }) => {
      const rect = await measureNode(ref.current ?? null);
      if (!rect) return; // chưa mount → không hiện (không crash)
      setStandalone({ rect, title, body, placement });
    },
    [],
  );

  const hideStandalone = useCallback(() => setStandalone(null), []);

  /** Đo lại rect target mỗi khi bước tour đổi (element có thể di chuyển/remount).
   *  Chỉ setState trong async path (then) — tránh react-hooks/set-state-in-effect. */
  useEffect(() => {
    if (!tour) return;
    const stepKey = `${tour.tourId}:${tour.stepIndex}`;
    let cancelled = false;
    void measureTarget(tour.steps[tour.stepIndex].targetKey).then((rect) => {
      // rect null (element chưa mount/không đo được) → không hiện overlay (không crash)
      if (!cancelled && rect) setMeasured({ stepKey, rect });
    });
    return () => {
      cancelled = true;
    };
  }, [tour, measureTarget]);

  const value = useMemo<GuidanceContextValue>(
    () => ({
      registerTarget,
      startTour,
      next,
      skip,
      dismissFeature,
      showDisabledHelper,
      hideStandalone,
      isTourActive: tour != null,
    }),
    [registerTarget, startTour, next, skip, dismissFeature, showDisabledHelper, hideStandalone, tour],
  );

  const currentStep = tour ? tour.steps[tour.stepIndex] : null;
  // Chỉ render overlay khi rect đo được KHỚP đúng tour+step hiện tại (tránh flash rect cũ)
  const stepKey = tour ? `${tour.tourId}:${tour.stepIndex}` : null;
  const showOverlay = !!(tour && currentStep && measured && measured.stepKey === stepKey);

  return (
    <GuidanceContext.Provider value={value}>
      {children}

      {/* Overlay tour: spotlight + tooltip — render ở root để phủ mọi màn hình */}
      {showOverlay && tour && currentStep && measured && (
        <SpotlightOverlay
          rect={measured.rect}
          screen={{ width, height }}
          title={currentStep.title}
          body={currentStep.body}
          placement={currentStep.placement}
          stepIndex={tour.stepIndex}
          totalSteps={tour.steps.length}
          onNext={next}
          onSkip={skip}
        />
      )}

      {/* Tooltip standalone (DisabledStateHelper): backdrop trong suốt bắt tap ngoài để đóng */}
      {standalone && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none" testID="guidance-standalone">
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={hideStandalone}
            accessibilityRole="button"
            accessibilityLabel={t('guidance.close')}
            testID="guidance-standalone-backdrop"
          />
          <Tooltip
            rect={standalone.rect}
            screen={{ width, height }}
            title={standalone.title}
            body={standalone.body}
            placement={standalone.placement}
          >
            <Pressable onPress={hideStandalone} hitSlop={8} accessibilityRole="button" testID="guidance-standalone-close"          >
            <Text style={styles.gotIt}>{t('guidance.gotIt')}</Text>
          </Pressable>
        </Tooltip>
      </View>
    )}
  </GuidanceContext.Provider>
  );
}


export function useGuidance(): GuidanceContextValue {
  const ctx = useContext(GuidanceContext);
  if (!ctx) throw new Error('useGuidance phải được dùng trong <GuidanceProvider>');
  return ctx;
}

const styles = StyleSheet.create({
  gotIt: { color: '#208AEF', fontSize: 14, fontWeight: '700', marginTop: 10, textAlign: 'right' },
});
