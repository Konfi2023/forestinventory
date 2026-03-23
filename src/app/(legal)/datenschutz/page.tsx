export const metadata = { title: 'Datenschutzerklärung – Forest Manager' };

export default function PrivacyPage() {
  return (
    <article className="prose prose-slate max-w-none">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Datenschutzerklärung</h1>
      <p className="text-sm text-slate-500 mb-2">Stand: März 2026</p>
      <p className="text-slate-600 leading-relaxed mb-10">
        Der Schutz Ihrer personenbezogenen Daten ist uns ein wichtiges Anliegen. Diese
        Datenschutzerklärung informiert Sie darüber, welche Daten wir im Rahmen der Nutzung von
        Forest Manager (forest-manager.eu) erheben, verarbeiten und an Dritte übermitteln.
      </p>

      <Section title="1. Verantwortlicher">
        <p>
          natureport UG (haftungsbeschränkt)<br />
          Willy-Brandt-Straße 23, 20457 Hamburg<br />
          E-Mail: <a href="mailto:info@natureport.eu" className="text-green-700 hover:underline">info@natureport.eu</a>
        </p>
      </Section>

      <Section title="2. Hosting & Server-Logfiles">
        <p>
          Unsere Server befinden sich in Europa (OHV Cloud, EU-Rechenzentrum).
          Bei jedem Seitenaufruf werden automatisch Server-Logfiles erfasst, darunter
          IP-Adresse, aufgerufene URL, Uhrzeit, HTTP-Statuscode und übertragene Datenmenge.
          Diese Daten dienen ausschließlich der technischen Sicherheit und Fehlerbehebung
          und werden nach spätestens 7 Tagen gelöscht.
        </p>
        <p className="mt-2">Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse).</p>
      </Section>

      <Section title="3. Registrierung & Authentifizierung (Keycloak)">
        <p>
          Für die Anmeldung nutzen wir <strong>Keycloak</strong>, einen Open-Source-Identity-Provider,
          der auf unseren eigenen Servern in Europa betrieben wird. Dabei werden
          Ihr Name, Ihre E-Mail-Adresse und Ihr Passwort (verschlüsselt, bcrypt) gespeichert.
          Es findet keine Übermittlung an Dritte statt.
        </p>
        <p className="mt-2">Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).</p>
      </Section>

      <Section title="4. Zahlungsabwicklung (Stripe)">
        <p>
          Kostenpflichtige Abonnements werden über <strong>Stripe Payments Europe, Ltd.</strong>
          {' '}(185 Berry St., Suite 550, San Francisco, CA 94107, USA) abgewickelt. Ihre
          Zahlungsdaten (Kreditkartennummer, Kontoverbindung) werden direkt an Stripe übertragen
          und dort verarbeitet. Wir selbst speichern keine vollständigen Zahlungsdaten.
          Stripe ist nach dem EU-US Data Privacy Framework zertifiziert.
        </p>
        <p className="mt-2">Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.</p>
        <p className="mt-1 text-slate-500 text-xs">
          Datenschutzhinweise Stripe:{' '}
          <a href="https://stripe.com/de/privacy" target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline">
            stripe.com/de/privacy
          </a>
        </p>
      </Section>

      <Section title="5. Kartendienste & Geodaten">
        <Subsection label="OpenStreetMap">
          Für die Basiskarte werden Kartenkacheln von <strong>OpenStreetMap</strong> (OpenStreetMap
          Foundation, St John's Innovation Centre, Cambridge, UK) geladen. Dabei wird Ihre
          IP-Adresse technisch bedingt an die OSM-Server übertragen. Lizenz: ODbL.
          <br />
          <a href="https://wiki.osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline text-xs mt-1 inline-block">
            Datenschutz OpenStreetMap
          </a>
        </Subsection>

        <Subsection label="ALKIS / INSPIRE (Katasterkarten)">
          Zur Anzeige amtlicher Flurstücksgrenzen werden WMS-Dienste der deutschen
          Vermessungsverwaltungen (ALKIS/INSPIRE) eingebunden. Dabei werden ausschließlich der
          angezeigte Kartenausschnitt (Bounding Box) und Ihre IP-Adresse übermittelt.
          Die Dienste stehen unter der Datenlizenz Deutschland – Namensnennung – Version 2.0.
          Es werden keine personenbezogenen Daten übermittelt.
        </Subsection>

        <Subsection label="Sentinel Hub / CDSE (Satellitendaten)">
          Zur Berechnung von Vegetationsindizes (NDVI) und Radar-Analysen (SAR) nutzen wir die
          API des <strong>Copernicus Data Space Ecosystem (CDSE)</strong> der Europäischen
          Weltraumorganisation (ESA). Dabei werden die Koordinaten Ihrer Waldpolygone an die
          API übermittelt, um standortbezogene Satellitenbilder abzurufen. Es werden keine
          personenbezogenen Daten an ESA/CDSE übermittelt. Die Verarbeitung erfolgt serverseitig.
          <br />
          <a href="https://dataspace.copernicus.eu/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline text-xs mt-1 inline-block">
            Datenschutz CDSE
          </a>
        </Subsection>

        <Subsection label="Windy (Wind- & Niederschlagskarte)">
          Als optionaler Kartenlayer wird die Wetterkarte von <strong>Windy.com</strong>
          {' '}(Windyty, SE, Tschechische Republik) eingebettet. Bei Aktivierung dieses Layers
          wird eine Verbindung zu den Windy-Servern hergestellt und Ihre IP-Adresse übertragen.
          Windy.com kann dabei eigene Cookies setzen.
          <br />
          <a href="https://windyty.com/privacy" target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline text-xs mt-1 inline-block">
            Datenschutz Windy
          </a>
        </Subsection>

        <p className="mt-2">Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) sowie
        lit. f DSGVO (berechtigtes Interesse an der Funktionserbringung).</p>
      </Section>

      <Section title="6. KI-Funktionen (OpenAI / GPT-4)">
        <p>
          Für KI-gestützte Analysen (z.&nbsp;B. Biomasse-Auswertungen und Empfehlungen) nutzen wir
          die API von <strong>OpenAI, LLC</strong> (3180 18th St., San Francisco, CA 94110, USA).
          Dabei werden aggregierte Walddaten (z.&nbsp;B. berechnete NDVI-Werte, Baumarten,
          Flächen in Hektar) an die OpenAI-API übermittelt. Es werden <strong>keine</strong>{' '}
          personenbezogenen Daten wie Name, E-Mail oder Adresse an OpenAI übertragen.
          Zur Wahrung Ihrer Privatsphäre werden alle Anfragen serverseitig verarbeitet.
          OpenAI ist nach dem EU-US Data Privacy Framework zertifiziert.
        </p>
        <p className="mt-2">
          Wir nutzen das Modell <strong>GPT-4o</strong>. OpenAI verwendet API-Eingaben
          nicht für das Training ihrer Modelle (API-Nutzungsbedingungen, Stand März 2024).
        </p>
        <p className="mt-2">Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
        an der Dienstleistungserbringung).</p>
        <p className="mt-1 text-slate-500 text-xs">
          Datenschutzhinweise OpenAI:{' '}
          <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline">
            openai.com/policies/privacy-policy
          </a>
        </p>
      </Section>

      <Section title="7. Wetterdaten (Open-Meteo)">
        <p>
          Für historische und aktuelle Wetterdaten (Niederschlag, Temperatur, Wind) nutzen wir
          die API von <strong>Open-Meteo</strong> (open-meteo.com), einem Open-Source-Projekt.
          Es werden ausschließlich die geographischen Koordinaten Ihrer Waldstandorte übermittelt.
          Keine personenbezogenen Daten werden an Open-Meteo übertragen. Die API erfordert keine
          Authentifizierung und speichert keine nutzerbezogenen Daten.
        </p>
        <p className="mt-2">Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.</p>
      </Section>

      <Section title="8. Cloud-Speicher & Datei-Upload (Hetzner Object Storage)">
        <p>
          Hochgeladene Fotos und Dokumente (z.&nbsp;B. Polterfotos, Aufnahmen aus der Inventur-App)
          werden verschlüsselt auf dem <strong>Hetzner Object Storage</strong> (S3-kompatibel,
          Standort Helsinki, EU) gespeichert. Hetzner Online GmbH, Gunzenhausen, ist als
          Auftragsverarbeiter gemäß Art. 28 DSGVO vertraglich gebunden.
        </p>
        <p className="mt-2">Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.</p>
      </Section>

      <Section title="9. E-Mail-Versand (Resend)">
        <p>
          System-E-Mails (z.&nbsp;B. Einladungen, Passwort-Reset, Benachrichtigungen) werden über
          den Dienstleister <strong>Resend Inc.</strong> (San Francisco, USA) versendet. Dabei
          werden E-Mail-Adresse und Inhalt der Nachricht übertragen. Resend ist nach dem
          EU-US Data Privacy Framework zertifiziert.
        </p>
        <p className="mt-2">Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.</p>
      </Section>

      <Section title="10. Fehler-Monitoring (GlitchTip)">
        <p>
          Zur Erkennung und Behebung von Programmfehlern nutzen wir <strong>GlitchTip</strong>,
          eine selbst gehostete, DSGVO-freundliche Alternative zu Sentry. Bei einem Fehler werden
          technische Informationen (Fehlertyp, Stacktrace, Browser-Informationen) erfasst.
          Es werden keine persönlichen Nutzerdaten in Fehlermeldungen gespeichert.
          Die Daten verbleiben auf unseren eigenen Servern in Europa.
        </p>
        <p className="mt-2">Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.</p>
      </Section>

      <Section title="11. Mobile App & Offline-Speicher">
        <p>
          Die mobile Web-App nutzt <strong>IndexedDB</strong> (Dexie.js) im Browser des Nutzers
          zur Offline-Datenspeicherung. Dabei werden Baumdaten, GPS-Koordinaten und Fotos
          lokal im Browser gespeichert, bis eine Internetverbindung besteht. Diese Daten
          verlassen das Gerät erst beim manuellen Synchronisierungsvorgang. Es werden
          keine Cookies für diesen Zweck gesetzt.
        </p>
      </Section>

      <Section title="12. Cookies & Tracking">
        <p>
          Wir setzen ausschließlich technisch notwendige Cookies (Session-Cookie für den Login).
          Es werden <strong>keine</strong> Tracking-Cookies, Analytics-Tools (Google Analytics,
          Matomo o.ä.) oder Werbe-Netzwerke eingesetzt. Es ist keine Cookie-Einwilligung
          erforderlich.
        </p>
      </Section>

      <Section title="13. Ihre Rechte">
        <p>Sie haben folgende Rechte gegenüber uns bezüglich Ihrer personenbezogenen Daten:</p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
          <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
          <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
          <li>Recht auf Löschung / „Vergessen werden" (Art. 17 DSGVO)</li>
          <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
          <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
          <li>Widerspruchsrecht (Art. 21 DSGVO)</li>
          <li>Beschwerderecht bei der zuständigen Aufsichtsbehörde</li>
        </ul>
        <p className="mt-3">
          Für Hamburg zuständige Aufsichtsbehörde: Der Hamburgische Beauftragte für Datenschutz
          und Informationsfreiheit, Ludwig-Erhard-Str. 22, 20459 Hamburg.
        </p>
        <p className="mt-2">
          Zur Ausübung Ihrer Rechte wenden Sie sich an:{' '}
          <a href="mailto:info@natureport.eu" className="text-green-700 hover:underline">
            info@natureport.eu
          </a>
        </p>
      </Section>

      <p className="mt-12 pt-6 border-t border-slate-200 text-xs text-slate-400">
        Diese Datenschutzerklärung wurde zuletzt am März 2026 aktualisiert.
        Wir behalten uns vor, diese bei Änderungen unserer Dienste zu aktualisieren.
      </p>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-base font-semibold text-slate-900 mb-3 pb-1 border-b border-slate-100">
        {title}
      </h2>
      <div className="text-slate-600 leading-relaxed text-sm space-y-1">{children}</div>
    </section>
  );
}

function Subsection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 pl-3 border-l-2 border-green-200">
      <p className="font-medium text-slate-800 text-sm mb-1">{label}</p>
      <p className="text-slate-600 text-sm leading-relaxed">{children}</p>
    </div>
  );
}
