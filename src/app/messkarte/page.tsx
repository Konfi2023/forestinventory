import type { Metadata } from 'next';
import { MesskarteClient } from './MesskarteClient';

export const metadata: Metadata = {
  title: 'Forest Manager – Messkarte drucken',
  description: 'BHD-Messkarte im Kreditkartenformat ausdrucken (85,6 × 54 mm)',
  robots: 'noindex',
};

export default function MesskartePage() {
  return <MesskarteClient />;
}
