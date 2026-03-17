import { SettingsTabsClient } from "./_components/SettingsTabsClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  let canManageRoles = false;
  if (userId) {
    const membership = await prisma.membership.findFirst({
      where: { userId, organization: { slug } },
      include: { role: true, user: { select: { isSystemAdmin: true } } },
    });
    canManageRoles =
      !!membership?.user?.isSystemAdmin ||
      membership?.role?.name === "Administrator";
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Administration</h2>
        <p className="text-muted-foreground">
          Verwalten Sie Ihre Organisation, das Team, Berechtigungen und Adressbücher.
        </p>
      </div>

      <SettingsTabsClient slug={slug} canManageRoles={canManageRoles} />

      <div className="py-4">
        {children}
      </div>
    </div>
  );
}