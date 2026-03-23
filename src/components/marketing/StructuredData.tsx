const APP_URL = 'https://forest-manager.eu';

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'natureport UG',
  legalName: 'natureport UG (haftungsbeschränkt)',
  url: APP_URL,
  logo: `${APP_URL}/og-image.png`,
  email: 'info@natureport.eu',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Willy-Brandt-Str. 23',
    addressLocality: 'Hamburg',
    postalCode: '20457',
    addressCountry: 'DE',
  },
  foundingLocation: { '@type': 'Place', name: 'Hamburg, Deutschland' },
  areaServed: ['DE', 'AT', 'CH', 'EU'],
};

const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Forest Manager',
  url: APP_URL,
  description: 'Digitale SaaS-Plattform für Forstmanagement, Waldinventur und EUDR-Konformität für Waldbesitzer und Forstbetriebe in Deutschland.',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, iOS, Android (PWA)',
  offers: [
    {
      '@type': 'Offer',
      name: 'Basis',
      price: '4.90',
      priceCurrency: 'EUR',
      priceSpecification: { '@type': 'UnitPriceSpecification', billingDuration: 'P1M' },
    },
    {
      '@type': 'Offer',
      name: 'Pro',
      price: '19.90',
      priceCurrency: 'EUR',
      priceSpecification: { '@type': 'UnitPriceSpecification', billingDuration: 'P1M' },
    },
    {
      '@type': 'Offer',
      name: 'Expert',
      price: '39.90',
      priceCurrency: 'EUR',
      priceSpecification: { '@type': 'UnitPriceSpecification', billingDuration: 'P1M' },
    },
  ],
  publisher: { '@type': 'Organization', name: 'natureport UG', url: APP_URL },
  inLanguage: 'de',
  countryOfOrigin: 'DE',
  keywords: 'Forstmanagement, Waldinventur, EUDR, Forstwirtschaft, GIS, Satellitenmonitoring',
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Forest Manager',
  url: APP_URL,
  description: 'Digitales Forstmanagement für Waldbesitzer und Forstbetriebe',
  inLanguage: 'de-DE',
  publisher: { '@type': 'Organization', name: 'natureport UG' },
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${APP_URL}/dashboard/search?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
};

export function StructuredData() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </>
  );
}
