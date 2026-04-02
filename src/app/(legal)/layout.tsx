import { Header } from '@/components/marketing/Header';
import { Footer } from '@/components/marketing/Footer';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
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
