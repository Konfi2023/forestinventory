import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { GeneralSettingsForm } from "./_components/GeneralSettingsForm";
import { getTranslations } from "next-intl/server";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user) return redirect('/api/auth/signin/keycloak');

  const org = await prisma.organization.findUnique({
    where: { slug },
  });

  if (!org) return notFound();

  const t = await getTranslations("SettingsPage");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t("pageTitle")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("pageSubtitle")}
        </p>
      </div>

      <GeneralSettingsForm organization={org} />
    </div>
  );
}