import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

// WICHTIG: Hier den exakten Pfad angeben!
const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const nextConfig: NextConfig = {
  // Keine experimentellen Features mehr, nur Standard
};

export default withNextIntl(nextConfig);