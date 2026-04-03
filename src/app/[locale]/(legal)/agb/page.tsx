import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { LegalPage } from '@/components/marketing/LegalPage';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Legal.terms' });
  return { title: t('title') + ' – ForestManager' };
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalPage namespace="terms" />;
}
