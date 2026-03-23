export const metadata = { title: 'AGB – ForestInventory' };

export default function TermsPage() {
  return (
    <article className="prose prose-slate max-w-none">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">
        Allgemeine Geschäftsbedingungen (AGB)
      </h1>
      <p className="text-sm text-slate-500 mb-10">Stand: März 2026</p>

      <Section title="1. Geltungsbereich">
        <p>
          Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung der Software-as-a-Service-Lösung
          „ForestInventory" (erreichbar unter forestinventory.de) der natureport UG (haftungsbeschränkt),
          Willy-Brandt-Str. 23, 20457 Hamburg (nachfolgend „Anbieter"), durch Verbraucher
          und Unternehmer (nachfolgend „Nutzer"). Abweichende Bedingungen des Nutzers werden nicht
          anerkannt, es sei denn, der Anbieter stimmt ihrer Geltung ausdrücklich schriftlich zu.
        </p>
      </Section>

      <Section title="2. Leistungsgegenstand">
        <p>
          Der Anbieter stellt eine webbasierte Plattform zur digitalen Verwaltung von Waldflächen
          bereit. Der Leistungsumfang umfasst insbesondere:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
          <li>Interaktive GIS-Karte zur Erfassung und Verwaltung von Waldpolygonen</li>
          <li>Holzernte- und Poltererfassung, Lieferscheinerstellung</li>
          <li>Aufgaben- und Maßnahmenmanagement</li>
          <li>Satellitengestützte Waldüberwachung (Biomasse, NDVI, SAR-Analyse)</li>
          <li>Automatische Wetterdaten-Auswertung</li>
          <li>KI-gestützte Analyse- und Empfehlungsfunktionen (powered by OpenAI GPT-4o)</li>
          <li>Mobile Web-App mit Offline-Funktion zur Waldinventur</li>
          <li>Vorbereitung zur EU-Entwaldungsverordnung (EUDR) / DDS-Erstellung</li>
          <li>Mehrmandantenfähigkeit für Forstbetriebsgemeinschaften</li>
        </ul>
        <p className="mt-3">
          Der Funktionsumfang richtet sich nach dem jeweils gewählten Abonnement. Änderungen
          am Leistungsumfang werden dem Nutzer rechtzeitig mitgeteilt.
        </p>
      </Section>

      <Section title="3. Vertragsschluss & Testphase">
        <p>
          Der Vertrag kommt durch die Registrierung des Nutzers und Auswahl eines Abonnements zustande.
          Neuen Nutzern wird eine kostenfreie Testphase von 30 Tagen gewährt. Nach Ablauf der
          Testphase wird das Konto in den gewählten kostenpflichtigen Plan überführt. Eine
          Kreditkarte ist für die Testphase nicht erforderlich.
        </p>
      </Section>

      <Section title="4. Geodaten & Drittdienste">
        <Subsection label="4.1 OpenStreetMap">
          Die Basiskarte basiert auf Daten von OpenStreetMap (© OpenStreetMap-Mitwirkende),
          lizenziert unter der Open Database License (ODbL). Der Nutzer ist verpflichtet, bei
          der Weitergabe von auf OpenStreetMap-Daten basierenden Inhalten die entsprechende
          Namensnennung zu verwenden.
        </Subsection>

        <Subsection label="4.2 ALKIS / INSPIRE (Flurstückskarten)">
          Die optionalen Flurstücks- und Katasterkarten basieren auf amtlichen Geobasisdaten der
          deutschen Vermessungsverwaltungen, bereitgestellt über WMS-Dienste (ALKIS/INSPIRE).
          Diese Daten stehen teilweise unter der{' '}
          <strong>Datenlizenz Deutschland – Namensnennung – Version 2.0</strong> sowie
          teilweise unter der <strong>Creative Commons CC BY-ND 4.0</strong>. Der Nutzer darf
          diese Karten zur Visualisierung und Überlagerung eigener Walddaten verwenden.
          Eine technische Extraktion, Weiterverarbeitung oder Erstellung abgeleiteter Kartenwerke
          ist gemäß den Lizenzbedingungen untersagt.
          <br /><br />
          Die Bereitstellung der Flurstückskarten erfolgt als kostenfreier Mehrwertdienst und
          ist nicht Bestandteil des kostenpflichtigen Abonnements. Der Anbieter übernimmt
          keine Gewähr für flächendeckende Verfügbarkeit, Aktualität oder Richtigkeit.
          Regionale Einschränkungen durch die Datenquellen sind möglich.
        </Subsection>

        <Subsection label="4.3 Copernicus / Sentinel Hub (Satellitendaten)">
          Satellitendaten (Sentinel-2, Sentinel-1) werden über das Copernicus Data Space Ecosystem
          (CDSE) der ESA abgerufen. Die Nutzung erfolgt gemäß den Nutzungsbedingungen des
          Copernicus-Programms der Europäischen Union. Die Daten stehen unter der
          Copernicus Open License. Satellitendaten werden nur für registrierte Forstflächen
          und deren definierte Polygone abgerufen.
        </Subsection>

        <Subsection label="4.4 Wetterdaten (Open-Meteo)">
          Historische und aktuelle Wetterdaten werden über Open-Meteo (open-meteo.com) abgerufen,
          einem Open-Source-Wetterdienst. Die Daten dienen der Analyse klimatischer Bedingungen
          im Kontext der Waldbewirtschaftung.
        </Subsection>

        <Subsection label="4.5 KI-Analyse (OpenAI / GPT-4o)">
          Bestimmte Analysefunktionen (z.&nbsp;B. Biomasse-Einschätzungen, Handlungsempfehlungen)
          werden mit Unterstützung der OpenAI API (Modell GPT-4o) bereitgestellt. Der Anbieter
          weist darauf hin, dass KI-generierte Inhalte Fehler enthalten können und keine
          forstfachliche Beratung ersetzen. Der Nutzer ist verantwortlich für die fachliche
          Überprüfung der Ausgaben. Der Anbieter haftet nicht für Entscheidungen, die
          ausschließlich auf Basis von KI-Ausgaben getroffen werden.
        </Subsection>

        <Subsection label="4.6 Windy (Wind- & Niederschlagsdaten)">
          Als optionaler Kartenlayer steht eine Einbindung von Windy.com zur Verfügung.
          Die Nutzung unterliegt den Nutzungsbedingungen von Windyty, SE. Der Layer wird
          nur auf Nutzeranforderung aktiviert.
        </Subsection>
      </Section>

      <Section title="5. Nutzungsrechte & Nutzerdaten">
        <p>
          Der Anbieter räumt dem Nutzer ein nicht-exklusives, nicht übertragbares Recht zur
          Nutzung der Plattform im Rahmen des gebuchten Abonnements ein. Der Nutzer bleibt
          Eigentümer aller von ihm eingegebenen Daten (Waldpolygone, Inventurdaten, Fotos etc.)
          und kann diese jederzeit exportieren. Der Anbieter verarbeitet diese Daten
          ausschließlich zur Vertragserfüllung.
        </p>
      </Section>

      <Section title="6. Preise, Zahlung & Abrechnung">
        <p>
          Die aktuellen Preise sind auf forestinventory.de einsehbar. Alle Preise verstehen sich
          zuzüglich der gesetzlichen Mehrwertsteuer (19&nbsp;%). Die Zahlung erfolgt über
          <strong> Stripe Payments Europe, Ltd.</strong> Kostenpflichtige Abonnements beginnen
          nach Ablauf der Testphase. Bei monatlicher Abrechnung wird der Betrag monatlich im
          Voraus vom gewählten Zahlungsmittel eingezogen. Bei jährlicher Abrechnung wird der
          Jahresbetrag jährlich im Voraus fällig.
        </p>
      </Section>

      <Section title="7. Laufzeit & Kündigung">
        <p>
          Kostenpflichtige Abonnements verlängern sich automatisch um den jeweils gewählten
          Zeitraum (monatlich oder jährlich), sofern nicht fristgerecht gekündigt wird.
          Die Kündigung ist jederzeit zum Ende der laufenden Abrechnungsperiode über das
          Account-Dashboard möglich. Nach Kündigung hat der Nutzer bis zum Ende der
          Abrechnungsperiode Zugriff auf alle Funktionen. Der Anbieter ist berechtigt,
          das Konto bei grober Verletzung dieser AGB oder bei Zahlungsverzug von mehr
          als 30 Tagen fristlos zu sperren.
        </p>
      </Section>

      <Section title="8. Verfügbarkeit & Wartung">
        <p>
          Der Anbieter strebt eine Verfügbarkeit von 99&nbsp;% im Jahresmittel an, garantiert
          diese jedoch nicht. Geplante Wartungsarbeiten werden, soweit möglich, auf
          Randzeiten (z.&nbsp;B. Nachts oder Wochenende) gelegt und vorab kommuniziert.
          Ein Anspruch auf ununterbrochene Verfügbarkeit besteht nicht.
        </p>
      </Section>

      <Section title="9. Haftung">
        <p>
          Der Anbieter haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie für
          Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit.
          Bei leichter Fahrlässigkeit ist die Haftung auf die Verletzung wesentlicher
          Vertragspflichten (Kardinalspflichten) beschränkt und auf den bei Vertragsschluss
          vorhersehbaren, typischen Schaden begrenzt. Eine Haftung für mittelbare Schäden
          und entgangenen Gewinn ist ausgeschlossen, soweit gesetzlich zulässig.
        </p>
        <p className="mt-3">
          Der Anbieter haftet nicht für die Richtigkeit von Satellitendaten, KI-Ausgaben,
          Wetterdaten oder amtlichen Geodaten (ALKIS), da diese von Drittanbietern stammen.
          Der Nutzer ist verpflichtet, forstfachliche Entscheidungen mit geeigneten Fachleuten
          abzustimmen.
        </p>
      </Section>

      <Section title="10. Widerrufsrecht (Verbraucher)">
        <p>
          Verbrauchern steht ein gesetzliches Widerrufsrecht von 14 Tagen ab Vertragsschluss zu.
          Das Widerrufsrecht erlischt vorzeitig, wenn die Dienstleistung vollständig erbracht
          wurde und der Nutzer vor Ablauf der Widerrufsfrist ausdrücklich zugestimmt hat,
          dass der Anbieter mit der Ausführung beginnt, und seine Kenntnis davon bestätigt hat,
          dass er sein Widerrufsrecht bei vollständiger Vertragserfüllung verliert.
        </p>
        <p className="mt-3">Widerrufsadresse: info@natureport.eu</p>
      </Section>

      <Section title="11. Datenschutz">
        <p>
          Die Erhebung und Verarbeitung personenbezogener Daten richtet sich nach unserer
          Datenschutzerklärung, abrufbar unter{' '}
          <a href="/datenschutz" className="text-green-700 hover:underline">
            forestinventory.de/datenschutz
          </a>.
        </p>
      </Section>

      <Section title="12. Änderungen der AGB">
        <p>
          Der Anbieter behält sich das Recht vor, diese AGB mit einer Ankündigungsfrist von
          mindestens 30 Tagen zu ändern. Änderungen werden dem Nutzer per E-Mail mitgeteilt.
          Widerspricht der Nutzer den geänderten AGB nicht innerhalb von 30 Tagen nach
          Zugang der Mitteilung, gelten die neuen AGB als akzeptiert. Auf dieses Widerspruchsrecht
          und die Folgen des Schweigens wird der Nutzer in der Mitteilung ausdrücklich hingewiesen.
        </p>
      </Section>

      <Section title="13. Schlussbestimmungen">
        <p>
          Es gilt das Recht der Bundesrepublik Deutschland. Für Verbraucher gilt dies nur,
          soweit dadurch keine zwingenden Verbraucherschutzvorschriften des Wohnsitzstaates
          des Nutzers eingeschränkt werden. Gerichtsstand ist Hamburg, soweit der Nutzer
          Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches
          Sondervermögen ist.
        </p>
        <p className="mt-3">
          Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, bleibt die
          Wirksamkeit der übrigen Bestimmungen davon unberührt.
        </p>
      </Section>

      <p className="mt-12 pt-6 border-t border-slate-200 text-xs text-slate-400">
        natureport UG (haftungsbeschränkt) · Willy-Brandt-Str. 23, 20457 Hamburg ·{' '}
        <a href="mailto:info@natureport.eu" className="hover:text-slate-600">info@natureport.eu</a>
        {' '}· Stand: März 2026
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
