import { Header } from '@/components/marketing/Header';
import { Footer } from '@/components/marketing/Footer';
import { setRequestLocale } from 'next-intl/server';

export default async function LegalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="bg-[#0a0f0a] text-white min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-28 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
