/**
 * +not-found.tsx — Màn hình hiển thị khi mở route không tồn tại
 * (deep-link sai path, URL hỏng...). Đảm bảo user luôn có lối thoát
 * về trang chủ thay vì kẹt ở màn hình lỗi mặc định.
 */
import { Link, Stack, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { safeBack } from '@/lib/navigation';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: 'Không tìm thấy trang' }} />
      <View style={styles.container}>
        <Text style={styles.code}>404</Text>
        <Text style={styles.title}>Không tìm thấy trang này</Text>
        <Text style={styles.subtitle}>
          Đường dẫn bạn mở không tồn tại trong app. Quay về trang chủ để tiếp tục.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => safeBack(router, '/(main)')}
        >
          <Text style={styles.buttonText}>Về trang chủ</Text>
        </TouchableOpacity>

        <Link href="/(main)" style={styles.link}>
          <Text style={styles.linkText}>hoặc mở trang chủ (link)</Text>
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
