import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { LegalPage } from '@/components/marketing/LegalPage';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Legal.privacy' });
  return { title: t('title') + ' – ForestManager' };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalPage namespace="privacy" />;
}
