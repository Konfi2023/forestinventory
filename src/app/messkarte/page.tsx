import { MesskarteClient } from './MesskarteClient';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata() {
  const t = await getTranslations('Messkarte');
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: 'noindex',
  };
}

export default function MesskartePage() {
  return <MesskarteClient />;
}
