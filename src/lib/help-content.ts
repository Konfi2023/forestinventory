export interface HelpContent {
  title: string;
  description: string;
  faqs: { question: string; answer: string }[];
  docsUrl?: string;
}

/**
 * Help content keyed by route suffix (after /dashboard/org/[slug]).
 * Empty string "" = Übersicht.
 */
export const HELP_CONTENT: Record<string, HelpContent> = {
  "": {
    title: "Übersicht",
    description:
      "Die Übersicht zeigt Ihnen auf einen Blick den aktuellen Status Ihres Betriebs: offene Aufgaben, anstehende Termine, Waldflächenübersicht und aktuelle Wetterdaten.",
    faqs: [
      {
        question: "Warum sehe ich keine Wetterdaten?",
        answer:
          "Wetterdaten werden nur angezeigt, wenn mindestens ein Wald mit gültigen Koordinaten angelegt ist. Legen Sie zuerst eine Waldfläche auf der Karte an.",
      },
      {
        question: "Wie aktualisiere ich die Übersicht?",
        answer:
          "Die Seite wird automatisch bei jedem Laden aktualisiert. Sie können die Seite jederzeit neu laden (F5), um die neuesten Daten abzurufen.",
      },
      {
        question: "Was bedeutet der Trial-Hinweis?",
        answer:
          "Ihr kostenloses Testzeitraum ist zeitlich begrenzt. Nach Ablauf können Sie unter 'Abrechnungen' ein Paket buchen, um alle Funktionen weiterhin zu nutzen.",
      },
    ],
  },

  "/map": {
    title: "Forstkarte",
    description:
      "Auf der Forstkarte können Sie Ihre Waldflächen als Polygone einzeichnen, importieren und verwalten. Zusätzlich können Sie Points of Interest (POIs) wie Hochsitze, Rückelager oder Fahrzeuge platzieren.",
    faqs: [
      {
        question: "Wie lege ich eine neue Waldfläche an?",
        answer:
          "Klicken Sie auf das Polygon-Werkzeug in der linken Werkzeugleiste und zeichnen Sie die Fläche auf der Karte ein. Klicken Sie abschließend auf den Startpunkt, um das Polygon zu schließen.",
      },
      {
        question: "Welche Formate kann ich importieren?",
        answer:
          "Unterstützt werden KML, GeoJSON und GeoPackage (GPKG). Klicken Sie auf das Upload-Symbol in der Werkzeugleiste und wählen Sie Ihre Datei aus.",
      },
      {
        question: "Was passiert, wenn mein Import fehlschlägt?",
        answer:
          "Häufige Ursachen sind: das Flächenlimit Ihres Pakets ist erreicht, die Datei enthält keine Polygon-Geometrien, oder die Koordinaten liegen außerhalb Europas. Der Fehlergrund wird als Hinweis angezeigt.",
      },
      {
        question: "Was sind POIs?",
        answer:
          "Points of Interest sind Punkte auf der Karte, die wichtige Orte markieren — z.B. Hochsitze, Holzlagerplätze, Hütten, Fahrzeuge oder besondere Bäume. Sie können POIs über die Werkzeugleiste hinzufügen.",
      },
    ],
  },

  "/tasks": {
    title: "Aufgaben & Planung",
    description:
      "Hier verwalten Sie alle forstlichen Aufgaben: von der einfachen To-do bis zur terminierten Maßnahme mit Zuweisung an Teammitglieder. Aufgaben können Waldflächen und Verantwortlichen zugeordnet werden.",
    faqs: [
      {
        question: "Wie weise ich eine Aufgabe einem Mitarbeiter zu?",
        answer:
          "Öffnen Sie eine Aufgabe und wählen Sie im Feld 'Zugewiesen an' ein Teammitglied aus. Das Mitglied muss zuvor unter Administration → Team & Mitglieder eingeladen worden sein.",
      },
      {
        question: "Was ist der Unterschied zwischen Aufgabe und Maßnahme?",
        answer:
          "Aufgaben sind allgemeine To-dos mit optionalem Fälligkeitsdatum. Maßnahmen (unter 'Maßnahmen & Holzverkauf') sind buchhalterisch relevante Forstmaßnahmen mit Kostenzuordnung.",
      },
      {
        question: "Kann ich wiederkehrende Aufgaben erstellen?",
        answer:
          "Ja, beim Erstellen einer Aufgabe gibt es die Option 'Wiederkehrend'. Sie können Intervall und Enddatum festlegen.",
      },
    ],
  },

  "/calendar": {
    title: "Kalender",
    description:
      "Der Kalender zeigt alle terminierten Aufgaben, Ereignisse und Fälligkeiten in einer Monats-, Wochen- oder Tagesansicht. Sie können hier auch direkt neue Aufgaben mit Datum anlegen.",
    faqs: [
      {
        question: "Wie exportiere ich den Kalender in meine Kalender-App?",
        answer:
          "Unter Administration → Allgemein finden Sie einen persönlichen iCal-Feed-Link, den Sie in Outlook, Apple Kalender oder Google Kalender eintragen können.",
      },
      {
        question: "Warum fehlen manche Aufgaben im Kalender?",
        answer:
          "Nur Aufgaben mit einem Fälligkeitsdatum erscheinen im Kalender. Aufgaben ohne Datum tauchen in der Aufgabenliste auf, nicht im Kalender.",
      },
    ],
  },

  "/biomass": {
    title: "Biomasse-Monitoring",
    description:
      "Das Biomasse-Monitoring wertet Satellitendaten aus, um Veränderungen in Ihrer Waldfläche zu erkennen — z.B. durch Kalamitäten, Holzeinschlag oder Aufforstung. Die Daten werden automatisch in regelmäßigen Abständen aktualisiert.",
    faqs: [
      {
        question: "Wie aktuell sind die Satellitendaten?",
        answer:
          "Die Daten werden alle 6–12 Tage aktualisiert, abhängig von der Wolkenbedeckung und der Überflugfrequenz des Sentinel-2-Satelliten.",
      },
      {
        question: "Was bedeutet der NDVI-Wert?",
        answer:
          "Der NDVI (Normalized Difference Vegetation Index) misst die Vegetation­sdichte. Werte nahe 1 bedeuten dichte, gesunde Vegetation. Werte unter 0.3 weisen auf kahle Flächen, Schadflächen oder Nadelholz im Winter hin.",
      },
      {
        question: "Warum sehe ich keine Daten für meinen Wald?",
        answer:
          "Der Wald muss als Fläche auf der Karte eingezeichnet sein. Sehr kleine Flächen (unter 1 ha) werden möglicherweise nicht ausgewertet. In der ersten Woche nach Anlage kann die Datenverarbeitung noch ausstehen.",
      },
    ],
  },

  "/operations": {
    title: "Maßnahmen & Holzverkauf",
    description:
      "Hier dokumentieren Sie forstliche Maßnahmen wie Einschlag, Pflanzung oder Pflege und erfassen Holzverkäufe mit Menge, Holzart und Erlös. Die Daten fließen in die Berichte und das Kostencontrolling ein.",
    faqs: [
      {
        question: "Wie lege ich einen Holzverkauf an?",
        answer:
          "Klicken Sie auf 'Neue Maßnahme', wählen Sie den Typ 'Holzverkauf' und tragen Sie Menge, Holzart, Preis pro Festmeter und Käufer ein. Der Gesamterlös wird automatisch berechnet.",
      },
      {
        question: "Kann ich Maßnahmen einer bestimmten Waldfläche zuordnen?",
        answer:
          "Ja, bei jeder Maßnahme können Sie die betroffene Waldfläche auswählen. Das ermöglicht eine flächenbezogene Auswertung im Controlling.",
      },
    ],
  },

  "/controlling": {
    title: "Zeitcontrolling",
    description:
      "Das Zeitcontrolling gibt Ihnen einen Überblick über erfasste Arbeitsstunden pro Aufgabe, Waldfläche und Mitarbeiter. So behalten Sie den Personalaufwand im Blick.",
    faqs: [
      {
        question: "Wie werden Zeiten erfasst?",
        answer:
          "Zeiten werden direkt an Aufgaben erfasst. Ein Teammitglied mit der Berechtigung 'Zeiten erfassen' kann bei jeder Aufgabe Stunden eintragen.",
      },
      {
        question: "Kann ich Berichte exportieren?",
        answer:
          "Eine Export-Funktion (CSV/PDF) ist in Vorbereitung. Aktuell können Sie die Tabellen manuell kopieren.",
      },
    ],
  },

  "/contacts": {
    title: "Kontakte",
    description:
      "Unter Kontakte verwalten Sie Waldbesitzer und Dienstleister — z.B. Lohnunternehmer, Sägewerke oder Behörden. Kontakte können Aufgaben und Maßnahmen zugeordnet werden.",
    faqs: [
      {
        question: "Was ist der Unterschied zwischen Waldbesitzer und Dienstleister?",
        answer:
          "Waldbesitzer sind Eigentümer von Waldflächen und können mit Ihren Wäldern verknüpft werden. Dienstleister sind externe Firmen oder Personen, die Sie beauftragen — z.B. für Einschlag oder Transport.",
      },
      {
        question: "Kann ich Kontakte importieren?",
        answer:
          "Ein CSV-Import ist in Planung. Aktuell werden Kontakte manuell angelegt.",
      },
    ],
  },

  "/billing": {
    title: "Abrechnungen",
    description:
      "Hier verwalten Sie Ihr Abonnement, sehen Ihre Rechnungen und können Ihre Zahlungsmethode ändern. Bei Ablauf des Testzeitraums können Sie hier ein Paket buchen.",
    faqs: [
      {
        question: "Wie ändere ich mein Paket?",
        answer:
          "Klicken Sie auf 'Paket ändern' und wählen Sie ein neues Paket. Wechsel auf ein höheres Paket werden sofort wirksam. Downgrades sind erst zum Ende des Abrechnungszeitraums möglich, wenn die Nutzung innerhalb der neuen Grenzen liegt.",
      },
      {
        question: "Wo finde ich meine Rechnungen?",
        answer:
          "Über den Button 'Rechnungsportal öffnen' gelangen Sie zum Stripe-Kundenportal, wo alle Rechnungen als PDF heruntergeladen werden können.",
      },
      {
        question: "Was passiert nach dem Testzeitraum?",
        answer:
          "Nach Ablauf des Testzeitraums werden alle Funktionen gesperrt, Ihre Daten bleiben jedoch erhalten. Sobald Sie ein Paket buchen, haben Sie sofort wieder vollen Zugriff.",
      },
    ],
  },

  "/settings": {
    title: "Administration",
    description:
      "Unter Administration verwalten Sie alle organisationsweiten Einstellungen: allgemeine Betriebsdaten, Team-Mitglieder, Rollen & Rechte, Stundensätze, MwSt.-Sätze und EUDR-Einstellungen.",
    faqs: [
      {
        question: "Wer kann die Einstellungen ändern?",
        answer:
          "Nur Benutzer mit der Rolle 'Administrator' haben Zugriff auf alle Einstellungen. Andere Rollen können eingeschränkten Zugriff erhalten.",
      },
      {
        question: "Wie lade ich neue Mitglieder ein?",
        answer:
          "Gehen Sie zu Team & Mitglieder und klicken Sie auf 'Mitglied einladen'. Geben Sie die E-Mail-Adresse ein und wählen Sie eine Rolle. Der Eingeladene erhält eine E-Mail mit einem Einladungslink.",
      },
    ],
  },

  "/settings/members": {
    title: "Team & Mitglieder",
    description:
      "Hier verwalten Sie alle Personen, die Zugriff auf Ihren Betrieb haben. Sie können neue Mitglieder einladen, Rollen zuweisen und den Zugriff auf bestimmte Waldflächen einschränken.",
    faqs: [
      {
        question: "Wie entferne ich ein Mitglied?",
        answer:
          "Klicken Sie auf das Papierkorb-Symbol neben dem Mitglied. Das Mitglied verliert sofort den Zugriff. Die von ihm erfassten Daten bleiben erhalten.",
      },
      {
        question: "Kann ein Mitglied mehrere Rollen haben?",
        answer:
          "Nein, jedes Mitglied hat genau eine Rolle. Die Rolle bestimmt alle Berechtigungen. Sie können die Rolle jederzeit ändern.",
      },
      {
        question: "Was passiert, wenn eine Einladung abläuft?",
        answer:
          "Einladungslinks sind 7 Tage gültig. Danach müssen Sie eine neue Einladung versenden.",
      },
    ],
  },

  "/settings/roles": {
    title: "Rollen & Rechte",
    description:
      "Hier definieren Sie, welche Benutzergruppen welche Funktionen sehen und nutzen dürfen. Über die Checkboxen steuern Sie granular: Wer darf die Karte sehen? Wer darf Aufgaben löschen? Wer sieht das Zeitcontrolling?",
    faqs: [
      {
        question: "Warum kann ich die Administrator-Rolle nicht bearbeiten?",
        answer:
          "Die Administrator-Rolle ist eine Systemrolle und hat immer alle Berechtigungen. Sie kann nicht eingeschränkt werden, damit der Betrieb immer administrierbar bleibt.",
      },
      {
        question: "Was bedeutet die Gruppe 'Seitenleiste – Sichtbarkeit'?",
        answer:
          "Diese Checkboxen steuern, welche Menüpunkte in der linken Navigation sichtbar sind. Wenn ein Benutzer keinen Zugriff auf 'Zeitcontrolling' haben soll, deaktivieren Sie diese Checkbox für seine Rolle.",
      },
      {
        question: "Kann ich eigene Rollen anlegen?",
        answer:
          "Ja, klicken Sie auf 'Neue Rolle erstellen'. Sie können den Namen frei wählen und dann die gewünschten Berechtigungen aktivieren.",
      },
    ],
  },

  "/settings/eudr": {
    title: "EUDR-Einstellungen",
    description:
      "Hier konfigurieren Sie die für Sie relevanten Einstellungen zur EU-Entwaldungsverordnung (EUDR). Legen Sie Ihren Aktivitätstyp fest (Inverkehrbringen, Import oder Export) und hinterlegen Sie ggf. Ihre EORI-Nummer.",
    faqs: [
      {
        question: "Was ist der Unterschied zwischen den Aktivitätstypen?",
        answer:
          "'Inverkehrbringen' gilt für EU-Waldbesitzer, die Holz erstmals auf den EU-Markt bringen. 'Import' und 'Export' gelten für grenzüberschreitenden Handel mit Drittländern — dabei ist eine EORI-Nummer Pflicht.",
      },
      {
        question: "Was ist eine EORI-Nummer?",
        answer:
          "Die Economic Operators Registration and Identification (EORI) ist eine EU-weite Kennung für Unternehmen im Außenhandel. Format: Länderkürzel + Ziffern, z.B. DE123456789. Sie erhalten diese beim zuständigen Zollamt.",
      },
    ],
  },

  "/settings/vat": {
    title: "MwSt.-Sätze",
    description:
      "Hier hinterlegen Sie die Mehrwertsteuersätze, die für Ihre Rechnungen verwendet werden. Sie können mehrere Sätze für verschiedene Länder anlegen und einen als Standard markieren.",
    faqs: [
      {
        question: "Welcher Satz wird auf Rechnungen angewendet?",
        answer:
          "Der als Standard markierte Satz (Stern-Symbol) wird automatisch bei neuen Rechnungen vorausgewählt. Sie können den Satz beim Erstellen einer Rechnung manuell ändern.",
      },
      {
        question: "Was bedeutet 'Kleinunternehmer'?",
        answer:
          "Wenn Ihr Betrieb unter die Kleinunternehmerregelung fällt (§ 19 UStG), wird auf Rechnungen keine MwSt. ausgewiesen. Diese Einstellung finden Sie unter Administration → Allgemein.",
      },
    ],
  },

  "/settings/rates": {
    title: "Stundensätze",
    description:
      "Hier definieren Sie interne Stundensätze für verschiedene Tätigkeiten und Maschinen. Diese Sätze werden im Zeitcontrolling und bei der Kostenkalkulation von Maßnahmen verwendet.",
    faqs: [
      {
        question: "Wofür werden die Stundensätze verwendet?",
        answer:
          "Die Stundensätze fließen in die Kostenkalkulation beim Zeitcontrolling ein. Wenn ein Mitarbeiter 3 Stunden für eine Aufgabe erfasst, wird der hinterlegte Satz automatisch für die Kostenberechnung herangezogen.",
      },
    ],
  },
};

/**
 * Find help content for a given pathname.
 * Strips the org prefix (/dashboard/org/[slug]) and matches the rest.
 */
export function getHelpContent(pathname: string): HelpContent | null {
  // Strip /dashboard/org/[slug] prefix
  const match = pathname.match(/^\/dashboard\/org\/[^/]+(\/.*)?$/);
  if (!match) return null;

  const suffix = match[1] ?? "";

  // Exact match first
  if (HELP_CONTENT[suffix]) return HELP_CONTENT[suffix];

  // Prefix match (e.g. /settings/members/something → /settings/members)
  const parts = suffix.split("/").filter(Boolean);
  for (let i = parts.length; i > 0; i--) {
    const key = "/" + parts.slice(0, i).join("/");
    if (HELP_CONTENT[key]) return HELP_CONTENT[key];
  }

  return null;
}
