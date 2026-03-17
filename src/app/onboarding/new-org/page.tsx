import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { NewOrgWizard } from "./NewOrgWizard";

export const metadata = { title: "Neuen Betrieb anlegen – Forest Inventory" };

export default async function NewOrgPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/api/auth/signin/keycloak");
  }

  // Find the user's current/last active org so we can offer a cancel link
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    include: { organization: { select: { slug: true } } },
    orderBy: { createdAt: "desc" },
  });

  const cancelHref = membership
    ? `/dashboard/org/${membership.organization.slug}`
    : "/dashboard";

  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  });

  return (
    <NewOrgWizard
      userEmail={session.user.email}
      cancelHref={cancelHref}
      plans={plans.map((p) => ({
        id: p.id,
        name: p.name,
        maxHectares: p.maxHectares,
        maxUsers: p.maxUsers,
        monthlyPrice: p.monthlyPrice,
        yearlyPrice: p.yearlyPrice,
        monthlyPriceId: p.monthlyPriceId,
        yearlyPriceId: p.yearlyPriceId,
        displayOrder: p.displayOrder,
      }))}
    />
  );
}
