import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- NEU: Helper für Avatare & Farben ---

export function getUserColor(name?: string | null) {
  const colors = [
    "bg-red-100 text-red-700 border-red-200",
    "bg-green-100 text-green-700 border-green-200",
    "bg-blue-100 text-blue-700 border-blue-200",
    "bg-orange-100 text-orange-700 border-orange-200",
    "bg-purple-100 text-purple-700 border-purple-200",
    "bg-pink-100 text-pink-700 border-pink-200",
    "bg-indigo-100 text-indigo-700 border-indigo-200",
    "bg-teal-100 text-teal-700 border-teal-200",
  ];
  
  if (!name) return "bg-slate-100 text-slate-700 border-slate-200";
  
  // Einfacher Hash-Algorithmus für konsistente Farben
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export function getInitials(first?: string | null, last?: string | null) {
  const f = first?.[0] || "";
  const l = last?.[0] || "";
  return (f + l).toUpperCase() || "?";
}

// Optional: Auch die Task-Farben zentralisieren
export function getTaskColor(priority: string) {
  switch (priority) {
      case 'URGENT': return '#ef4444';
      case 'HIGH': return '#f97316';
      case 'MEDIUM': return '#3b82f6';
      default: return '#94a3b8';
  }
}