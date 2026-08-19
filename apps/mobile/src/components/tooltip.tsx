/**
 * tooltip.tsx — Popup hướng dẫn đính kèm element target (auto-position).
 *
 * Cách hoạt động:
 *  1. Render "ẩn" (opacity 0) để đo kích thước thật của card qua onLayout.
 *  2. Có kích thước → gọi `computeTooltipPosition` (lib thuần) tính vị trí theo
 *     rect element target + kích thước màn hình → tự flip khi thiếu chỗ, clamp mép.
 *  3. Đặt đúng vị trí + hiện (opacity 1).
 *
 * Component thuần hiển thị — mọi quyết định vị trí nằm ở `guidance-position.ts` (test được).
 */
import { ReactNode, useState } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { computeTooltipPosition, Placement, Rect, Size } from '@/lib/guidance-position';

type TooltipProps = {
  /** Rect của element target (window coords — từ measureNode). */
  rect: Rect;
  /** Kích thước màn hình (useWindowDimensions) — để clamp. */
  screen: Size;
  title?: string;
  body: string;
  /** Placement ưu tiên — tự flip khi thiếu chỗ. */
  placement?: Placement;
  /** Nội dung tùy chọn phía dưới body (vd nút Skip/Next/Done). */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function Tooltip({ rect, screen, title, body, placement, children, style }: TooltipProps) {
  const [size, setSize] = useState<Size | null>(null);
  // Chưa đo được kích thước → giữ ẩn ở góc (không nhấp nháy vị trí sai)
  const pos = size ? computeTooltipPosition({ targetRect: rect, tooltipSize: size, screen, placement }) : null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.positioner, pos ? { left: pos.x, top: pos.y } : { left: 0, top: 0, opacity: 0 }]}
    >
      <View
        pointerEvents={pos ? 'auto' : 'none'}
        style={[styles.card, style]}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          // Tránh vòng lặp: chỉ set lại khi kích thước thực sự đổi
          setSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
        }}
      >
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={styles.body}>{body}</Text>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  positioner: { position: 'absolute' },
  card: {
    maxWidth: 280,
    backgroundColor: 'rgba(20, 24, 30, 0.96)',
    borderRadius: 12,
    padding: 14,
    // Đổ bóng nhẹ để tách khỏi nền spotlight
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  title: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  body: { color: 'rgba(255,255,255,0.92)', fontSize: 13, lineHeight: 19 },
});
