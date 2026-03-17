"use client";

import { ChevronsUpDown, Check, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";

interface Props {
  currentOrg: { id: string; name: string; slug: string };
  allMemberships: { 
    organization: { id: string; name: string; slug: string } 
  }[];
}

export function OrgSwitcher({ currentOrg, allMemberships }: Props) {
  const router = useRouter();

  const handleSwitch = (slug: string) => {
    router.push(`/dashboard/org/${slug}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-between px-2 h-12 hover:bg-slate-800 text-slate-300 hover:text-white"
        >
          <div className="flex items-center gap-3 text-left overflow-hidden">
            <div className="h-8 w-8 rounded-md bg-emerald-600 flex items-center justify-center shrink-0 text-white font-bold border border-emerald-500">
               {currentOrg.name[0].toUpperCase()}
            </div>
            <div className="flex flex-col truncate">
                <span className="text-sm font-semibold text-white truncate w-32">
                    {currentOrg.name}
                </span>
                <span className="text-[10px] text-slate-400">
                    Mandant wechseln
                </span>
            </div>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start" side="right">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Organisationen</DropdownMenuLabel>
        
        {allMemberships.map((m) => (
          <DropdownMenuItem
            key={m.organization.id}
            onClick={() => handleSwitch(m.organization.slug)}
            className="flex items-center justify-between cursor-pointer py-3"
          >
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6 rounded-sm">
                <AvatarFallback className="text-[10px] bg-slate-100 text-slate-700">
                  {m.organization.name[0]}
                </AvatarFallback>
              </Avatar>
              <span className="truncate w-40 font-medium">{m.organization.name}</span>
            </div>
            {m.organization.id === currentOrg.id && <Check className="h-4 w-4 text-emerald-600" />}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push("/onboarding/new-org")}
          className="flex items-center gap-2 cursor-pointer py-2.5 text-emerald-700 font-medium hover:text-emerald-800"
        >
          <Plus className="h-4 w-4" />
          Neuen Betrieb anlegen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}