"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "monitoring", label: "SAR & NDVI-Monitoring" },
  { id: "eudr",       label: "EUDR-Compliance" },
];

export function BiomassTabsClient({ slug, activeTab }: { slug: string; activeTab: string }) {

  return (
    <div className="flex border-b border-slate-200 space-x-6">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={`/dashboard/org/${slug}/biomass${tab.id !== "monitoring" ? `?tab=${tab.id}` : ""}`}
          className={cn(
            "pb-3 text-sm font-medium transition-colors border-b-2",
            activeTab === tab.id
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
