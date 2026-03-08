import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  LayoutDashboard,
  Trees,
  Settings,
  ClipboardList,
  CalendarDays,
  Map as MapIcon,
  Leaf,
  LogOut,
  PackageOpen,
  BarChart2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MobileNav } from "./_components/MobileNav";
import { OrgSwitcher } from "./_components/OrgSwitcher";

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
    redirect("/api/auth/signin");
  }

  // 1. Aktuelle Organisation laden
  const org = await prisma.organization.findUnique({
    where: { slug },
  });

  if (!org) {
    return notFound();
  }

  // 2. Prüfen, ob der User Mitglied in dieser Org ist
  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      organizationId: org.id,
    },
    include: { role: true }
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
          
          <NavItem href={`/dashboard/org/${slug}/map`} icon={<MapIcon size={20} />} label="Karte" />

          <NavItem href={`/dashboard/org/${slug}/tasks`} icon={<ClipboardList size={20} />} label="Aufgaben & Planung" />
          
          <NavItem href={`/dashboard/org/${slug}/calendar`} icon={<CalendarDays size={20} />} label="Kalender" />
          
          <NavItem href={`/dashboard/org/${slug}/forest`} icon={<Trees size={20} />} label="Waldbestände" />

          <NavItem href={`/dashboard/org/${slug}/biomass`} icon={<Leaf size={20} />} label="Biomasse-Monitoring" />

          <NavItem href={`/dashboard/org/${slug}/operations`} icon={<PackageOpen size={20} />} label="Maßnahmen & Holzverkauf" />

          <NavItem href={`/dashboard/org/${slug}/controlling`} icon={<BarChart2 size={20} />} label="Zeitcontrolling" />

          {/* Spacer, damit Einstellungen unten klebt oder zumindest Abstand hat */}
          <div className="mt-auto pb-4">
             <div className="my-2 border-t border-slate-800" />
             <NavItem href={`/dashboard/org/${slug}/settings`} icon={<Settings size={20} />} label="Einstellungen" />
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
          {children}
      </main>
    </div>
  );
}

// Hilfskomponente für die Links
function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
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