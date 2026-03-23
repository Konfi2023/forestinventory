export const metadata = { title: 'Impressum – ForestInventory' };

export default function ImprintPage() {
  return (
    <article className="prose prose-slate max-w-none">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Impressum</h1>
      <p className="text-sm text-slate-500 mb-10">Angaben gemäß § 5 TMG</p>

      <Section title="Angaben gemäß § 5 TMG">
        <p>
          natureport UG (haftungsbeschränkt)<br />
          Willy-Brandt-Straße 23<br />
          20457 Hamburg<br />
          Deutschland
        </p>
      </Section>

      <Section title="Vertreten durch">
        <p>Geschäftsführer: Aschkan Allahgholi</p>
      </Section>

      <Section title="Kontakt">
        <p>
          E-Mail: <a href="mailto:info@natureport.eu" className="text-green-700 hover:underline">info@natureport.eu</a><br />
          Web: <a href="https://forestinventory.de" className="text-green-700 hover:underline">forestinventory.de</a>
        </p>
      </Section>

      <Section title="Registereintrag">
        <p>
          Eintragung im Handelsregister.<br />
          Registergericht: Amtsgericht Hamburg<br />
          Registernummer: HRB 194200
        </p>
      </Section>

      <Section title="Umsatzsteuer-ID">
        <p>
          Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
          DE457114766
        </p>
      </Section>

      <Section title="Streitschlichtung (EU)">
        <p>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
          <a
            href="https://ec.europa.eu/consumers/odr/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-700 hover:underline"
          >
            https://ec.europa.eu/consumers/odr/
          </a>
          .<br />
          Unsere E-Mail-Adresse finden Sie oben im Impressum.
        </p>
      </Section>

      <Section title="Verbraucherstreitbeilegung">
        <p>
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </Section>

      <Section title="Inhaltlich Verantwortlicher">
        <p>
          Inhaltlich verantwortlich gemäß § 55 Abs. 2 RStV:<br />
          natureport UG (haftungsbeschränkt)<br />
          Willy-Brandt-Straße 23<br />
          20457 Hamburg
        </p>
      </Section>

      <p className="mt-12 pt-6 border-t border-slate-200 text-sm text-slate-400">
        Haftungshinweis: Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung
        für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich
        deren Betreiber verantwortlich.
      </p>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-slate-900 mb-2 pb-1 border-b border-slate-100">
        {title}
      </h2>
      <div className="text-slate-600 leading-relaxed text-sm">{children}</div>
    </section>
  );
}
