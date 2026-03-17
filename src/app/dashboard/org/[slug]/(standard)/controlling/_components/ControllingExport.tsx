"use client";

import { Download } from "lucide-react";

type TimeEntry = {
  id: string;
  durationMinutes: number | null;
  category: string;
  startTime: Date;
  hourlyRateOverride: unknown;
  rateCategory: { key: string | null; hourlyRate: unknown } | null;
  user: { id: string; firstName: string | null; lastName: string | null; email: string } | null;
};

type Task = {
  id: string;
  title: string;
  status: string;
  estimatedTime: number | null;
  forest: { id: string; name: string };
  operation: { id: string; title: string } | null;
  assignee: { id: string; firstName: string | null; lastName: string | null; email: string } | null;
  timeEntries: TimeEntry[];
};

const CATEGORY_LABELS: Record<string, string> = {
  MANUAL_WORK:  "Handarbeit",
  MACHINE_WORK: "Maschine",
  PLANNING:     "Planung",
  TRAVEL:       "Anfahrt",
  INSPECTION:   "Begehung",
};

function resolveRate(entry: TimeEntry): number | null {
  if (entry.hourlyRateOverride !== null && entry.hourlyRateOverride !== undefined) {
    return Number(entry.hourlyRateOverride);
  }
  if (entry.rateCategory?.hourlyRate !== undefined) {
    return Number(entry.rateCategory.hourlyRate);
  }
  return null;
}

function entryCost(entry: TimeEntry): number | null {
  const rate = resolveRate(entry);
  if (rate === null) return null;
  return ((entry.durationMinutes ?? 0) / 60) * rate;
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Offen", IN_PROGRESS: "In Arbeit", REVIEW: "Prüfung",
  BLOCKED: "Blockiert", DONE: "Erledigt",
};

function fmtMins(mins: number): string {
  if (mins === 0) return "0h";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function escapeCsv(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(";") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function ControllingExport({ tasks }: { tasks: Task[] }) {
  function download() {
    const BOM = "\uFEFF";
    const header = [
      "Aufgabe", "Status", "Wald", "Maßnahme", "Zugewiesen",
      "Geschätzt (Min)", "Gebucht (Min)", "Datum", "Kategorie", "Bearbeiter",
      "Stundensatz (€)", "Kosten (€)",
    ].join(";");

    const rows: string[] = [];

    for (const task of tasks) {
      const assigneeName = task.assignee
        ? (task.assignee.firstName && task.assignee.lastName
            ? `${task.assignee.firstName} ${task.assignee.lastName}`
            : task.assignee.email)
        : "";

      if (task.timeEntries.length === 0) {
        rows.push([
          task.title,
          STATUS_LABELS[task.status] ?? task.status,
          task.forest.name,
          task.operation?.title ?? "",
          assigneeName,
          task.estimatedTime ?? "",
          "", "", "", "", "", "",
        ].map(escapeCsv).join(";"));
      } else {
        for (const entry of task.timeEntries) {
          const entryUser = entry.user
            ? (entry.user.firstName && entry.user.lastName
                ? `${entry.user.firstName} ${entry.user.lastName}`
                : entry.user.email)
            : "";
          const rate = resolveRate(entry);
          const cost = entryCost(entry);
          rows.push([
            task.title,
            STATUS_LABELS[task.status] ?? task.status,
            task.forest.name,
            task.operation?.title ?? "",
            assigneeName,
            task.estimatedTime ?? "",
            entry.durationMinutes ?? "",
            new Date(entry.startTime).toLocaleDateString("de-DE"),
            CATEGORY_LABELS[entry.category] ?? entry.category,
            entryUser,
            rate !== null ? rate.toFixed(2) : "",
            cost !== null ? cost.toFixed(2) : "",
          ].map(escapeCsv).join(";"));
        }
      }
    }

    const csv = BOM + header + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zeitcontrolling_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={download}
      className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-800 transition-colors shadow-sm"
    >
      <Download className="w-3.5 h-3.5" />
      CSV exportieren ({tasks.length})
    </button>
  );
}
