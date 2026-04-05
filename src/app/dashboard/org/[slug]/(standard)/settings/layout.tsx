import { SettingsTabsClient } from "./_components/SettingsTabsClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

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

  const t = await getTranslations("SettingsPage");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("layoutTitle")}</h2>
        <p className="text-muted-foreground">
          {t("layoutSubtitle")}
        </p>
      </div>

      <SettingsTabsClient slug={slug} canManageRoles={canManageRoles} />

      <div className="py-4">
        {children}
      </div>
    </div>
  );
}