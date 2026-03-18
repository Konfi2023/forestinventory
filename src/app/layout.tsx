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

export const metadata: Metadata = {
  title: "Forest Inventory",
  description: "Digitales Forstverwaltungssystem",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ForestDB",
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
            {children}
            <Toaster />
          </NextAuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}