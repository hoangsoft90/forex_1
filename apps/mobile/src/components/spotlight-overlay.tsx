/**
 * spotlight-overlay.tsx — Overlay làm mờ toàn màn hình + "spotlight" element target
 * (hở sáng đúng vị trí element) + tooltip hướng dẫn đính kèm + điều hướng bước tour.
 *
 * Kỹ thuật: KHÔNG dùng SVG để cắt lỗ — thay bằng 4 band View absolute nền đen bán
 * trong suốt bao quanh rect target (xem `buildSpotlightBands` trong guidance-position.ts).
 * Phần không bị band che = chính là "lỗ spotlight" hiện element target.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { buildSpotlightBands, Placement, Rect, Size } from '@/lib/guidance-position';

import Tooltip from './tooltip';

type SpotlightOverlayProps = {
  /** Rect của element target (window coords). */
  rect: Rect;
  screen: Size;
  title: string;
  body: string;
  placement?: Placement;
  /** Bước hiện tại (1-based hiển thị) + tổng số bước. */
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
};

export default function SpotlightOverlay({
  rect,
  screen,
  title,
  body,
  placement,
  stepIndex,
  totalSteps,
  onNext,
  onSkip,
}: SpotlightOverlayProps) {
  const { t } = useTranslation();
  const bands = buildSpotlightBands(rect, screen);
  const isLast = stepIndex >= totalSteps - 1;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" testID="guidance-spotlight">
      {/* 4 band làm mờ quanh target — tự phủ toàn màn hình trừ vùng spotlight */}
      {bands.map((b, i) => (
        <View key={i} style={[styles.band, { left: b.x, top: b.y, width: b.width, height: b.height }]} />
      ))}

      {/* Viền spotlight nổi bật element target (pointerEvents none — không chặn tap element) */}
      <View
        pointerEvents="none"
        style={[styles.ring, { left: rect.x - 2, top: rect.y - 2, width: rect.width + 4, height: rect.height + 4 }]}
      />

      {/* Tooltip hướng dẫn + footer điều hướng (Skip | Bước x/y | Next/Done) */}
      <Tooltip rect={rect} screen={screen} title={title} body={body} placement={placement}>
        <View style={styles.footer}>
          <Text style={styles.counter}>
            {t('guidance.stepOf', { current: stepIndex + 1, total: totalSteps })}
          </Text>
          <Pressable onPress={onSkip} hitSlop={8} accessibilityRole="button" testID="guidance-skip">
            <Text style={styles.skipText}>{t('guidance.skip')}</Text>
          </Pressable>
          <Pressable onPress={onNext} hitSlop={8} accessibilityRole="button" testID="guidance-next">
            <Text style={styles.nextText}>{isLast ? t('guidance.done') : t('guidance.next')}</Text>
          </Pressable>
        </View>
      </Tooltip>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { backgroundColor: 'rgba(0,0,0,0.65)', position: 'absolute' },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 10,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 12,
  },
  counter: { marginRight: 'auto', color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  skipText: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  nextText: { color: '#208AEF', fontSize: 14, fontWeight: '700' },
});
