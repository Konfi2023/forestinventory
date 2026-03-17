"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ContactsTabsClient({ slug }: { slug: string }) {
  const pathname = usePathname();

  const tabs = [
    { href: `/dashboard/org/${slug}/contacts/owners`, label: "Waldbesitzer" },
    { href: `/dashboard/org/${slug}/contacts/service-providers`, label: "Dienstleister" },
  ];

  return (
    <div className="flex border-b border-slate-200 space-x-6">
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
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
