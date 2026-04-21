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
    <div className="fm-cream min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-24 px-8">
        <div className="max-w-[780px] mx-auto">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
