import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InviteList } from "@/components/dashboard/InviteList";
import { LogOut } from "lucide-react";
import Link from "next/link";

export default async function DashboardRoot({
  searchParams,
}: {
  searchParams: Promise<{ createOrg?: string }>;
}) {
  const { createOrg } = await searchParams;
  const session = await getServerSession(authOptions);

  // Sicherheit: Nicht eingeloggt -> Raus
  if (!session?.user?.email) {
    redirect('/api/auth/signin/keycloak');
  }

  // 1. Hat der User schon Organisationen? -> Redirect zur zuletzt aktiven Org
  // Guard: neuer User hat noch keinen DB-Eintrag (id ist undefined bis Org-Erstellung)
  if (session.user.id) {
    const [memberships, dbUser] = await Promise.all([
      prisma.membership.findMany({
        where: { userId: session.user.id },
        include: { organization: true },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { lastActiveOrgId: true },
      }),
    ]);
  
    if (memberships.length > 0) {
      const lastActive = dbUser?.lastActiveOrgId
        ? memberships.find(m => m.organizationId === dbUser.lastActiveOrgId)
        : null;
      const targetSlug = (lastActive ?? memberships[0]).organization.slug;
      redirect(`/dashboard/org/${targetSlug}`);
    }
  }

  // 2. Hat der User offene Einladungen? -> Invite Screen anzeigen
  const pendingInvites = await prisma.invite.findMany({
    where: { 
        email: { equals: session.user.email, mode: 'insensitive' },
        status: "PENDING"
    },
    include: { 
        organization: true,
        role: true 
    }
  });

  if (pendingInvites.length > 0 && createOrg !== '1') {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <LogoutButton />
            <InviteList invites={pendingInvites} />
        </div>
    );
  }

  // 3. Weder Org noch Invite -> Onboarding Wizard
  redirect('/onboarding');
}

function LogoutButton() {
    return (
        <div className="absolute top-4 right-4">
            <Link href="/api/auth/signout" className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-2">
                <LogOut size={16} /> Abmelden
            </Link>
        </div>
    );
}