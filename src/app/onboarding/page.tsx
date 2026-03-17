import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OnboardingWizard } from "./OnboardingWizard";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/api/auth/signin/keycloak");
  }

  // If user already has an org, redirect to dashboard
  if (session.user.id) {
    const membership = await prisma.membership.findFirst({
      where: { userId: session.user.id },
      include: { organization: { select: { slug: true, onboardingComplete: true } } },
    });
    if (membership?.organization?.onboardingComplete) {
      redirect(`/dashboard/org/${membership.organization.slug}`);
    }
  }

  const params = await searchParams;
  const initialStep = params.step ? parseInt(params.step, 10) : 1;

  // Load plans for step 3
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  });

  return (
    <OnboardingWizard
      userEmail={session.user.email}
      initialStep={initialStep}
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
