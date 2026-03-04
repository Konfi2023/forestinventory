import { SettingsTabsClient } from "./_components/SettingsTabsClient";

export default async function SettingsLayout({
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
        <h2 className="text-2xl font-bold tracking-tight">Einstellungen</h2>
        <p className="text-muted-foreground">
          Verwalten Sie Ihre Organisation, das Team und Berechtigungen.
        </p>
      </div>

      <SettingsTabsClient slug={slug} />

      <div className="py-4">
        {children}
      </div>
    </div>
  );
}