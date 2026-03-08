"use client";

import { useState } from "react";
import { Plus, Trees, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OperationCard } from "./OperationCard";
import { NewOperationDialog } from "./NewOperationDialog";

interface Forest { id: string; name: string; color: string | null; }

interface Props {
  operations: any[];
  forests: Forest[];
  logPilePois: any[];
  orgSlug: string;
}

export function OperationList({ operations, forests, logPilePois, orgSlug }: Props) {
  const [year, setYear] = useState<number | "ALL">("ALL");

  const years = [...new Set(operations.map((o: any) => o.year))].sort((a, b) => b - a);

  const filtered = year === "ALL"
    ? operations
    : operations.filter((o: any) => o.year === year);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Jahres-Filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setYear("ALL")}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              year === "ALL" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            Alle Jahre
          </button>
          {years.map(y => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                year === y ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {y}
            </button>
          ))}
        </div>

        <NewOperationDialog forests={forests} orgSlug={orgSlug} />
      </div>

      {/* Leerer Zustand */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center shadow-sm">
          <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <PackageOpen size={22} className="text-amber-500" />
          </div>
          <p className="font-semibold text-slate-700">Noch keine Maßnahmen</p>
          <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
            Erstellen Sie Ihre erste Einschlagsmaßnahme, um Polter und Holzverkäufe zu erfassen.
          </p>
        </div>
      )}

      {/* Operations */}
      <div className="space-y-4">
        {filtered.map((op: any) => (
          <OperationCard
            key={op.id}
            operation={op}
            logPilePois={logPilePois}
            orgSlug={orgSlug}
          />
        ))}
      </div>
    </div>
  );
}
