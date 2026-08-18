import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function OnboardingLayout() {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: t('common.back'),
        title: 'Onboarding',
      }}
    />
  );
}
