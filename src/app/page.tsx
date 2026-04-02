import type { Metadata } from 'next';
import { Header } from '@/components/marketing/Header';
import { Footer } from '@/components/marketing/Footer';
import { StructuredData } from '@/components/marketing/StructuredData';
import { LandingPageClient } from '@/components/marketing/LandingPageClient';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'ForestManager – Digitales Forstmanagement für Europa',
  description: 'Die führende SaaS-Plattform für Waldbesitzer und Forstbetriebe: GIS-Karte, Satellitenüberwachung, EUDR-Konformität und KI-Analyse. 30 Tage kostenlos testen.',
  alternates: { canonical: 'https://forest-manager.eu' },
  openGraph: {
    title: 'ForestManager – Digitales Forstmanagement',
    description: 'GIS-Karte, Satellitenüberwachung, EUDR-Konformität und KI-Analyse für Waldbesitzer und Forstbetriebe in Europa.',
    url: 'https://forest-manager.eu',
    type: 'website',
  },
};

export default async function Home() {
  const dbPlans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
    select: { id: true, name: true, monthlyPrice: true, maxHectares: true, maxUsers: true },
  });

  // Serialize Decimal to number for client component
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
