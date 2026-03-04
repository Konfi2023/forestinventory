"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Trees } from "lucide-react";
import { updateUserForestAccess } from "@/actions/users";
import { toast } from "sonner";

interface Props {
  user: any;
  forests: { id: string; name: string }[];
  orgSlug: string;
}

export function ManageAccessDialog({ user, forests, orgSlug }: Props) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState<string[]>(
    user.accessibleForests?.map((f: any) => f.id) || []
  );

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateUserForestAccess(orgSlug, user.id, selectedIds);
      setOpen(false);
      toast.success("Zugriffsrechte gespeichert");
    } catch (e) {
      toast.error("Fehler beim Speichern");
    } finally {
      setIsLoading(false);
    }
  };

  const toggle = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Wald-Zugriff verwalten">
            <Trees className="w-4 h-4 text-slate-500" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
            <DialogTitle>Wald-Zugriff für {user.firstName || user.email}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-2 max-h-[60vh] overflow-y-auto">
            <p className="text-sm text-muted-foreground mb-4">
                Wählen Sie aus, welche Waldbestände dieser Nutzer sehen und bearbeiten darf.
            </p>
            {forests.length === 0 ? (
                <p className="text-sm italic text-slate-400">Keine Wälder angelegt.</p>
            ) : (
                forests.map(forest => (
                    <div key={forest.id} className="flex items-center space-x-2 border p-2 rounded hover:bg-slate-50">
                        <Checkbox 
                            id={`forest-${forest.id}`} 
                            checked={selectedIds.includes(forest.id)}
                            onCheckedChange={() => toggle(forest.id)}
                        />
                        <label htmlFor={`forest-${forest.id}`} className="flex-1 text-sm font-medium cursor-pointer">
                            {forest.name}
                        </label>
                    </div>
                ))
            )}
        </div>
        <Button onClick={handleSave} disabled={isLoading} className="w-full">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Speichern
        </Button>
      </DialogContent>
    </Dialog>
  );
}