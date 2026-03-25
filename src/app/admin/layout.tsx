import { requireSystemAdmin } from "@/lib/admin-auth";
import Link from "next/link";
import { LayoutDashboard, Building2, Users, ShieldAlert, LogOut, Activity, CreditCard, Wifi, Ticket } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Hard Security Check beim Laden der Seite
  await requireSystemAdmin();

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar - Extra dunkel/anders als User Dashboard */}
      <aside className="w-64 bg-slate-950 text-slate-200 flex flex-col shadow-xl">
        <div className="p-6 border-b border-slate-800">
          <div className="font-bold text-xl tracking-tight flex items-center gap-2">
            <ShieldAlert className="text-red-500" />
            <span>Admin<span className="text-red-500">Panel</span></span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavLink href="/admin" icon={<LayoutDashboard />} label="Übersicht" />
          <NavLink href="/admin/organizations" icon={<Building2 />} label="Organisationen" />
          <NavLink href="/admin/users" icon={<Users />} label="Alle Benutzer" />
          <NavLink href="/admin/health" icon={<Activity />} label="Health Monitor" />
          <NavLink href="/admin/plans" icon={<CreditCard />} label="Pakete" />
          <NavLink href="/admin/coupons" icon={<Ticket />} label="Gutscheine" />
          <NavLink href="/admin/traces" icon={<Wifi />} label="TRACES NT API" />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <Link href="/" className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors">
            <LogOut size={16} />
            <span>App verlassen</span>
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
}

function NavLink({ href, icon, label }: any) {
  return (
    <Link 
      href={href} 
      className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-slate-800 text-sm font-medium transition-all hover:text-white"
    >
      {/* Icon klein rendern */}
      <span className="[&>svg]:w-4 [&>svg]:h-4">{icon}</span>
      {label}
    </Link>
  )
}