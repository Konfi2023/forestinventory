import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/marketing/Header';
import { Footer } from '@/components/marketing/Footer';
import { StructuredData } from '@/components/marketing/StructuredData';
import { LandingPageClient } from '@/components/marketing/LandingPageClient';
import { prisma } from '@/lib/prisma';
import { routing } from '@/i18n/routing';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Landing.meta' });

  const canonical = locale === 'de' ? 'https://forest-manager.eu' : `https://forest-manager.eu/${locale}`;

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical,
      languages: Object.fromEntries(
        routing.locales.map(l => [l, l === 'de' ? 'https://forest-manager.eu' : `https://forest-manager.eu/${l}`])
      ),
    },
    openGraph: {
      title: t('ogTitle'),
      description: t('ogDescription'),
      url: canonical,
      type: 'website',
    },
  };
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const dbPlans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
    select: { id: true, name: true, monthlyPrice: true, maxHectares: true, maxUsers: true },
  });

  const plans = dbPlans.map(p => ({
    id: p.id,
    name: p.name,
    monthlyPrice: p.monthlyPrice ? Number(p.monthlyPrice) : null,
    maxHectares: p.maxHectares,
    maxUsers: p.maxUsers,
  }));

  return (
    <div className="bg-[#0a0f0a] text-white min-h-screen">
      <StructuredData />
      <Header />
      <LandingPageClient dbPlans={plans} />
      <Footer />
    </div>
  );
}
