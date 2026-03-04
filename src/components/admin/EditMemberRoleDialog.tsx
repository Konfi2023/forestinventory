"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2, Loader2 } from "lucide-react";
import { updateOrgMemberRole } from "@/actions/admin"; // Stelle sicher, dass diese Action existiert
import { toast } from "sonner";

interface Props {
  membershipId: string;
  currentRoleId: string;
  roles: { id: string; name: string }[];
}

export function EditMemberRoleDialog({ membershipId, currentRoleId, roles }: Props) {
  const [roleId, setRoleId] = useState(currentRoleId);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateOrgMemberRole(membershipId, roleId);
      setOpen(false);
      toast.success("Rolle erfolgreich geändert");
    } catch (e) {
      toast.error("Fehler beim Ändern der Rolle");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6" title="Rolle ändern">
            <Settings2 className="w-3 h-3 text-slate-500" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
            <DialogTitle>Rolle neu zuweisen</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
           <p className="text-sm text-muted-foreground">
             Wähle eine neue Rolle für dieses Mitglied aus.
           </p>
           <Select value={roleId} onValueChange={setRoleId}>
             <SelectTrigger>
                <SelectValue placeholder="Rolle wählen" />
             </SelectTrigger>
             <SelectContent>
               {roles.map((r) => (
                 <SelectItem key={r.id} value={r.id}>
                    {r.name}
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
        </div>
        <Button onClick={handleSave} disabled={isLoading} className="w-full">
           {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} 
           Speichern
        </Button>
      </DialogContent>
    </Dialog>
  );
}