/**
 * +not-found.tsx — Màn hình hiển thị khi mở route không tồn tại
 * (deep-link sai path, URL hỏng...). Đảm bảo user luôn có lối thoát
 * về trang chủ thay vì kẹt ở màn hình lỗi mặc định.
 */
import { Link, Stack, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { safeBack } from '@/lib/navigation';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: t('notFound.title') }} />
      <View style={styles.container}>
        <Text style={styles.code}>404</Text>
        <Text style={styles.title}>{t('notFound.pageTitle')}</Text>
        <Text style={styles.subtitle}>{t('notFound.subtitle')}</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => safeBack(router, '/(main)')}
        >
          <Text style={styles.buttonText}>{t('notFound.home')}</Text>
        </TouchableOpacity>

        <Link href="/(main)" style={styles.link}>
          <Text style={styles.linkText}>{t('notFound.homeLink')}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  code: { fontSize: 56, fontWeight: '800', color: '#208AEF' },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 14, opacity: 0.7, textAlign: 'center', lineHeight: 20 },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 16,
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  link: { marginTop: 12 },
  linkText: { color: '#208AEF', fontSize: 13 },
});
