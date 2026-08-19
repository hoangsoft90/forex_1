/**
 * feature-badge.tsx — Dot/label "New" đánh dấu tính năng mới trên icon/button.
 *
 * Hành vi:
 *  - Hiển thị khi feature chưa từng bị dismiss (`hasFeatureDismissed` = false).
 *  - User bấm vào badge (hoặc gọi `dismissFeature`) → dismiss vĩnh viễn
 *    (lưu AsyncStorage) → không hiện lại ở lần mở app sau (không spam).
 *  - Dùng kèm FeatureBadge với `variant='dot'` cho icon nhỏ, `variant='label'` cho row/menu.
 */
import { useEffect, useState } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import { hasFeatureDismissed } from '@/lib/guidance-storage';

import { useGuidance } from './guidance-context';

type FeatureBadgeProps = {
  /** Key ổn định định danh feature — lưu `guidance.feature.<key>.dismissed`. */
  featureKey: string;
  /** 'dot' (chấm nhỏ trên icon) | 'label' (pill "New" có chữ). Mặc định 'label'. */
  variant?: 'dot' | 'label';
  /** Override label (mặc định t('guidance.badgeNew')). */
  label?: string;
  style?: StyleProp<ViewStyle>;
};

export default function FeatureBadge({ featureKey, variant = 'label', label, style }: FeatureBadgeProps) {
  const { t } = useTranslation();
  const { dismissFeature } = useGuidance();
  const [visible, setVisible] = useState(false);

  // Chỉ hiện nếu feature chưa bị dismiss (đọc 1 lần khi mount)
  useEffect(() => {
    let cancelled = false;
    hasFeatureDismissed(featureKey)
      .then((dismissed) => {
        if (!cancelled) setVisible(!dismissed);
      })
      .catch(() => {
        if (!cancelled) setVisible(true); // fail-open: lỗi đọc → hiện (chỉ hướng dẫn, không quan trọng)
      });
    return () => {
      cancelled = true;
    };
  }, [featureKey]);

  if (!visible) return null;

  const text = label ?? t('guidance.badgeNew');

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={text}
      testID={`feature-badge-${featureKey}`}
      onPress={() => {
        void dismissFeature(featureKey);
        setVisible(false); // ẩn ngay lập tức trong phiên này
      }}
      style={[variant === 'dot' ? styles.dot : styles.pill, style]}
    >
      {variant === 'label' ? <Text style={styles.label}>{text}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E91E63',
  },
  pill: {
    backgroundColor: '#E91E63',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  label: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
