import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

// --- 1. FEHLENDE IMPORTS FÜR SPRACHE (i18n) HINZUFÜGEN ---
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

// --- 2. KORREKTER PFAD ZUM AUTH PROVIDER ---
// Du hast die Datei unter src/components/providers/ angelegt
import { NextAuthProvider } from "@/components/providers/NextAuthProvider";
import { SentryProvider } from "@/components/providers/SentryProvider";
import { SessionGuard } from "@/components/providers/SessionGuard";
import { DeploymentGuard } from "@/components/providers/DeploymentGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a",
};

const APP_URL = 'https://forest-manager.eu';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Forest Manager – Digitales Forstmanagement',
    template: '%s | Forest Manager',
  },
  description: 'Forest Manager ist die digitale Plattform für Waldbesitzer, Forstbetriebe und Waldbesitzervereinigungen – mit GIS-Karte, Satellitenüberwachung, EUDR-Konformität und KI-Analyse. Entwickelt in Deutschland.',
  keywords: [
    'Forstmanagement Software', 'Waldinventur digital', 'EUDR Software', 'Waldverwaltung',
    'Forstbetrieb Software', 'Waldinventur App', 'Forstwirtschaft digitalisieren',
    'EU-Entwaldungsverordnung', 'Waldbesitzer Software', 'GIS Forstwirtschaft',
    'Satellitenmonitoring Wald', 'Forstbetriebsgemeinschaft Software',
  ],
  authors: [{ name: 'natureport UG', url: APP_URL }],
  creator: 'natureport UG',
  publisher: 'natureport UG',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: {
    canonical: APP_URL,
    languages: { 'de-DE': APP_URL },
  },
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: APP_URL,
    siteName: 'Forest Manager',
    title: 'Forest Manager – Digitales Forstmanagement',
    description: 'GIS-Karte, Satellitenüberwachung, EUDR-Konformität und KI-Analyse für Waldbesitzer und Forstbetriebe. Entwickelt in Deutschland.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Forest Manager – Digitales Forstmanagement' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Forest Manager – Digitales Forstmanagement',
    description: 'GIS-Karte, Satellitenüberwachung, EUDR-Konformität und KI-Analyse für Waldbesitzer und Forstbetriebe.',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Forest Manager',
  },
  other: {
    'geo.region': 'DE',
    'geo.placename': 'Hamburg, Deutschland',
    'geo.position': '53.5753;10.0153',
    'ICBM': '53.5753, 10.0153',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Diese Funktionen waren rot, weil der Import oben fehlte
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Hier waren die Komponenten rot, weil der Import fehlte */}
        <NextIntlClientProvider messages={messages}>
          <SentryProvider dsn={process.env.NEXT_PUBLIC_SENTRY_DSN} />
          <NextAuthProvider>
            <SessionGuard />
            <DeploymentGuard />
            {children}
            <Toaster />
          </NextAuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}