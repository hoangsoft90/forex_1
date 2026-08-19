/**
 * disabled-state-helper.tsx — Giải thích lý do nút bị disabled + điều kiện unlock.
 *
 * Cách hoạt động:
 *  - Khi `disabled=false` → pass-through: render đúng children, không can thiệp gì.
 *  - Khi `disabled=true` → wrap nút trong View (có ref để đo rect), phủ 1 Pressable
 *    trong suốt lên trên (nút gốc giữ visual disabled). User tap → đo rect của nút
 *    → hiện tooltip standalone (qua GuidanceProvider) nêu lý do + điều kiện unlock.
 *
 * Lưu ý: nút gốc (children) KHÔNG cần tự xử lý onPress khi disabled — Pressable phủ
 * sẽ bắt tap thay, nên hành vi gốc không bao giờ chạy nhầm khi đang khóa.
 */
import { ReactElement, useRef } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Placement } from '@/lib/guidance-position';

import { useGuidance } from './guidance-context';

type DisabledStateHelperProps = {
  disabled: boolean;
  /** Lý do nút bị khóa (i18n key đã dịch) — hiển thị làm title tooltip. */
  reason: string;
  /** Điều kiện unlock (i18n key đã dịch) — hiển thị làm body tooltip. */
  unlock?: string;
  placement?: Placement;
  /** Nút gốc (TouchableOpacity/Button...). */
  children: ReactElement;
  style?: StyleProp<ViewStyle>;
};

export default function DisabledStateHelper({
  disabled,
  reason,
  unlock,
  placement,
  children,
  style,
}: DisabledStateHelperProps) {
  const { t } = useTranslation();
  const { showDisabledHelper } = useGuidance();
  const wrapRef = useRef<View | null>(null);

  if (!disabled) return children; // pass-through: nút bình thường, không đổi gì

  return (
    <View ref={wrapRef} collapsable={false} style={style} testID="disabled-state-helper">
      {/* Nút gốc vẫn render (giữ visual disabled) nhưng bị chặn tap bởi Pressable phủ */}
      {children}
      <Pressable
        style={StyleSheet.absoluteFill}
        accessibilityRole="button"
        accessibilityLabel={reason}
        testID="disabled-state-helper-tap-catcher"
        onPress={() => {
          void showDisabledHelper({
            ref: wrapRef,
            title: reason,
            body: unlock ?? t('guidance.disabledUnlockFallback'),
            placement,
          });
        }}
      />
    </View>
  );
}
