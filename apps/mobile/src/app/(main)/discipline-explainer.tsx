import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function DisciplineExplainerScreen() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('disciplineExplainer.title')}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Discipline Score</Text>
        <Text style={styles.cardBody}>{t('disciplineExplainer.disciplineBody')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Edge Score</Text>
        <Text style={styles.cardBody}>{t('disciplineExplainer.edgeBody')}</Text>
      </View>

      <View style={styles.note}>
        <Text style={styles.noteText}>{t('disciplineExplainer.note')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  card: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 16, gap: 6 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#208AEF' },
  cardBody: { fontSize: 14, lineHeight: 20, opacity: 0.85 },
  note: { backgroundColor: '#F0F4F8', borderRadius: 10, padding: 14 },
  noteText: { fontSize: 13, lineHeight: 19, opacity: 0.8 },
});
