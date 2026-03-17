import { ContactsTabsClient } from "./_components/ContactsTabsClient";

export default async function ContactsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Kontakte</h2>
        <p className="text-muted-foreground">
          Adressbücher für Waldbesitzer und Dienstleister Ihrer Organisation.
        </p>
      </div>
      <ContactsTabsClient slug={slug} />
      <div className="py-4">
        {children}
      </div>
    </div>
  );
}
