import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  LayoutDashboard,
  Settings,
  ClipboardList,
  CalendarDays,
  Map as MapIcon,
  Leaf,
  LogOut,
  PackageOpen,
  BarChart2,
  Euro,
  CreditCard,
  BookUser,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MobileNav } from "./_components/MobileNav";
import { OrgSwitcher } from "./_components/OrgSwitcher";
import { HelpPanel } from "@/components/help/HelpPanel";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const session = await getServerSession(authOptions);
  
  // Wichtig für Next.js 15: params müssen awaited werden
  const { slug } = await params;

  if (!session?.user) {
    redirect('/api/auth/signin/keycloak');
  }

  // 1. Aktuelle Organisation laden
  const org = await prisma.organization.findUnique({
    where: { slug },
  });

  if (!org) {
    return notFound();
  }

  // 1b. Onboarding Guard: unvollständiges Onboarding -> zurück zum Wizard
  if (!org.onboardingComplete) {
    redirect('/onboarding');
  }

  // 2. Prüfen, ob der User Mitglied in dieser Org ist
  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      organizationId: org.id,
    },
    include: { role: { select: { name: true, permissions: true } } }
  });

  if (!membership) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 gap-4">
            <h1 className="text-2xl font-bold text-red-600">Zugriff verweigert</h1>
            <p className="text-slate-600">Sie sind kein Mitglied der Organisation "{slug}".</p>
            <Link href="/dashboard">
                <div className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800 transition">
                    Zurück zur Übersicht
                </div>
            </Link>
        </div>
    );
  }

  // 2b. lastActiveOrgId aktualisieren wenn der User in einer anderen Org ist
  if (session.user.id) {
    const dbUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { lastActiveOrgId: true } });
    if (dbUser?.lastActiveOrgId !== org.id) {
      await prisma.user.update({ where: { id: session.user.id }, data: { lastActiveOrgId: org.id } });
    }
  }

  // 2c. Nav-Sichtbarkeit berechnen (Admin sieht immer alles)
  const isOrgAdmin = membership.role.name === "Administrator";
  const navPerms = membership.role.permissions;
  const canNav = (perm: string) => isOrgAdmin || navPerms.includes(perm);

  // 3. Alle Mitgliedschaften laden (für den Org-Switcher)
  const allMemberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    include: { 
        organization: { select: { id: true, name: true, slug: true } } 
    }
  });

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden flex-col md:flex-row">
      
      {/* --- MOBILE NAVIGATION (Nur sichtbar auf kleinen Screens) --- */}
      <MobileNav
        orgName={org.name}
        orgSlug={slug}
        userEmail={session.user.email || ""}
        roleName={membership.role.name}
        navPermissions={navPerms}
        isOrgAdmin={isOrgAdmin}
      />

      {/* --- DESKTOP SIDEBAR (Versteckt auf Mobile, sichtbar ab md) --- */}
      <aside className="hidden md:flex w-64 bg-slate-950 border-r border-slate-800 text-slate-300 flex-col shrink-0 z-20">
        
        {/* Header mit Org-Switcher */}
        <div className="h-16 flex items-center px-2 border-b border-slate-800 bg-slate-950/50">
            <OrgSwitcher 
                currentOrg={org} 
                allMemberships={allMemberships} 
            />
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 space-y-1 mt-6 overflow-y-auto custom-scrollbar flex flex-col">
          <NavItem href={`/dashboard/org/${slug}`} icon={<LayoutDashboard size={20} />} label="Übersicht" />

          {canNav("nav:map") && <NavItem href={`/dashboard/org/${slug}/map`} icon={<MapIcon size={20} />} label="Karte" />}

          {canNav("nav:tasks") && <NavItem href={`/dashboard/org/${slug}/tasks`} icon={<ClipboardList size={20} />} label="Aufgaben & Planung" />}

          {canNav("nav:calendar") && <NavItem href={`/dashboard/org/${slug}/calendar`} icon={<CalendarDays size={20} />} label="Kalender" />}

          {canNav("nav:biomass") && <NavItem href={`/dashboard/org/${slug}/biomass`} icon={<Leaf size={20} />} label="Biomasse-Monitoring" />}

          {canNav("nav:operations") && <NavItem href={`/dashboard/org/${slug}/operations`} icon={<PackageOpen size={20} />} label="Maßnahmen & Holzverkauf" />}

          {canNav("nav:controlling") && <NavItem href={`/dashboard/org/${slug}/controlling`} icon={<BarChart2 size={20} />} label="Zeitcontrolling" />}

          <NavItem href={`/dashboard/org/${slug}/kostencontrolling`} icon={<Euro size={20} />} label="Rechnungen & Berichte" soon />

          {/* Spacer, damit Kontakte, Abrechnungen & Administration unten klebt */}
          <div className="mt-auto pb-4">
             <div className="my-2 border-t border-slate-800" />
             {canNav("nav:contacts") && <NavItem href={`/dashboard/org/${slug}/contacts`} icon={<BookUser size={20} />} label="Kontakte" />}
             {canNav("nav:billing") && <NavItem href={`/dashboard/org/${slug}/billing`} icon={<CreditCard size={20} />} label="Abrechnungen" />}
             <NavItem href={`/dashboard/org/${slug}/settings`} icon={<Settings size={20} />} label="Administration" />
          </div>
        </nav>

        {/* User Footer (Profil info) */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30">
            <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border border-slate-600">
                    <AvatarFallback className="bg-slate-700 text-white text-xs">
                        {session.user.email?.[0].toUpperCase() || "U"}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium text-white truncate" title={session.user.email || ""}>
                        {session.user.email}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                        {membership.role.name}
                    </p>
                </div>
                <Link href="/api/auth/signout" title="Abmelden"
                  className="text-slate-600 hover:text-red-400 transition shrink-0">
                  <LogOut size={16} />
                </Link>
            </div>
        </div>
      </aside>
      
      {/* MAIN CONTENT AREA */}
      {/* WICHTIG: Kein Padding, kein Margin, volle Breite für die Karte */}
      <main className="flex-1 relative w-full h-full overflow-hidden">
          <TrialExpiredGate org={org} slug={slug}>
            {children}
          </TrialExpiredGate>
          <HelpPanel />
      </main>
    </div>
  );
}

// ── Trial-Expired Gate ────────────────────────────────────────────────────────
async function TrialExpiredGate({
  org,
  slug,
  children,
}: {
  org: { subscriptionStatus: string; stripeSubscriptionId: string | null; trialEndsAt: Date | null };
  slug: string;
  children: React.ReactNode;
}) {
  const isExpired =
    org.subscriptionStatus === "CANCELED" &&
    !org.stripeSubscriptionId;

  if (!isExpired) return <>{children}</>;

  // Billing-Seite immer durchlassen
  const hdrs = await headers();
  const pathname = hdrs.get("x-current-path") ?? "";
  if (pathname.endsWith("/billing") || pathname.includes("/billing")) {
    return <>{children}</>;
  }

  return (
    <div className="flex-1 overflow-auto bg-slate-50 h-full w-full flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-5">
        <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
          <CreditCard size={24} className="text-amber-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Testzeitraum abgelaufen</h2>
          <p className="text-slate-500 text-sm mt-2 leading-relaxed">
            Ihr kostenloser Testzeitraum ist abgelaufen. Wählen Sie ein Paket, um Forest Inventory
            weiter zu nutzen. Ihre Daten bleiben erhalten.
          </p>
        </div>
        <Link
          href={`/dashboard/org/${slug}/billing`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 transition text-sm"
        >
          <CreditCard size={16} /> Paket wählen &amp; weitermachen
        </Link>
        <p className="text-xs text-slate-400">
          Fragen? <a href="mailto:info@forest-inventory.eu" className="text-green-700 hover:underline">info@forest-inventory.eu</a>
        </p>
      </div>
    </div>
  );
}

// ── NavItem ───────────────────────────────────────────────────────────────────
function NavItem({ href, icon, label, soon }: { href: string; icon: React.ReactNode; label: string; soon?: boolean }) {
  if (soon) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium opacity-40 cursor-not-allowed select-none">
        <span className="text-slate-500">{icon}</span>
        <span className="text-slate-500">{label}</span>
        <span className="ml-auto text-[10px] font-bold uppercase tracking-wide bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">Bald</span>
      </div>
    );
  }
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-slate-800 hover:text-white transition-all text-sm font-medium group"
    >
      <span className="text-slate-400 group-hover:text-white transition-colors">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}