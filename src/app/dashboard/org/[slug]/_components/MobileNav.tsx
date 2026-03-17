"use client";

import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, LayoutDashboard, ClipboardList, CalendarDays, Settings, CreditCard, BookUser, Euro } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Props {
  orgName: string;
  orgSlug: string;
  userEmail: string;
  roleName: string;
}

export function MobileNav({ orgName, orgSlug, userEmail, roleName }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Die Links für die mobile Ansicht (angepasst an die neue Struktur)
  const mobileLinks = [
    { href: `/dashboard/org/${orgSlug}`, label: "Übersicht", icon: LayoutDashboard, soon: false },
    { href: `/dashboard/org/${orgSlug}/tasks`, label: "Aufgaben & Planung", icon: ClipboardList, soon: false },
    { href: `/dashboard/org/${orgSlug}/calendar`, label: "Kalender", icon: CalendarDays, soon: false },
    { href: `/dashboard/org/${orgSlug}/contacts`, label: "Kontakte", icon: BookUser, soon: false },
    { href: `/dashboard/org/${orgSlug}/kostencontrolling`, label: "Rechnungen & Berichte", icon: Euro, soon: true },
    { href: `/dashboard/org/${orgSlug}/billing`, label: "Abrechnungen", icon: CreditCard, soon: false },
    { href: `/dashboard/org/${orgSlug}/settings`, label: "Administration", icon: Settings, soon: false },
  ];

  return (
    <div className="flex items-center justify-between p-4 border-b bg-slate-900 text-white md:hidden sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-slate-800">
              <Menu size={24} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] bg-slate-900 border-r-slate-800 text-slate-300 p-0 flex flex-col">
            <SheetHeader className="p-6 text-left border-b border-slate-800">
                <SheetTitle className="text-white font-bold">{orgName}</SheetTitle>
                <p className="text-xs text-slate-500">Mobile App v0.1</p>
            </SheetHeader>

            <nav className="flex-1 flex flex-col p-4 gap-2 overflow-y-auto">
              {mobileLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || pathname.startsWith(link.href + "/");

                if (link.soon) {
                  return (
                    <div key={link.href} className="flex items-center gap-3 px-4 py-3 rounded-md opacity-40 cursor-not-allowed select-none">
                      <Icon size={20} className="text-slate-500" />
                      <span className="text-slate-500">{link.label}</span>
                      <span className="ml-auto text-[10px] font-bold uppercase tracking-wide bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">Bald</span>
                    </div>
                  );
                }

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-md transition-colors",
                      isActive
                        ? "bg-slate-800 text-white font-medium"
                        : "hover:bg-slate-800/50 hover:text-white"
                    )}
                  >
                    <Icon size={20} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* User Footer im Menü */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/30">
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-slate-600">
                        <AvatarFallback className="bg-slate-700 text-white text-xs">
                            {userEmail?.[0].toUpperCase() || "U"}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-white truncate">{userEmail}</p>
                        <p className="text-xs text-slate-500 truncate">{roleName}</p>
                    </div>
                </div>
            </div>
          </SheetContent>
        </Sheet>
        <span className="font-semibold text-lg tracking-tight truncate max-w-[200px]">{orgName}</span>
      </div>
      
      {/* Platzhalter für spätere Aktionen (z.B. Notfall-Knopf) */}
      <div className="w-8"></div> 
    </div>
  );
}