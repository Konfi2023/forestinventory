"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SettingsTabsClient({ slug, canManageRoles }: { slug: string; canManageRoles: boolean }) {
  const pathname = usePathname();

  const tabs = [
    { href: `/dashboard/org/${slug}/settings`, label: "Allgemein", exact: true },
    { href: `/dashboard/org/${slug}/settings/members`, label: "Team & Mitglieder", exact: false },
    ...(canManageRoles ? [{ href: `/dashboard/org/${slug}/settings/roles`, label: "Rollen & Rechte", exact: false }] : []),
    { href: `/dashboard/org/${slug}/settings/rates`, label: "Stundensätze", exact: false },
    { href: `/dashboard/org/${slug}/settings/vat`, label: "MwSt.-Sätze", exact: false },
    { href: `/dashboard/org/${slug}/settings/eudr`, label: "EUDR-Compliance", exact: false },
    { href: `/dashboard/org/${slug}/settings/account`, label: "Mein Account", exact: false },
  ];

  return (
    <div className="flex border-b border-slate-200 space-x-6">
      {tabs.map((tab) => {
        const isActive = tab.exact 
          ? pathname === tab.href 
          : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "pb-3 text-sm font-medium transition-colors border-b-2",
              isActive
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}