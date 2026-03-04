"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Loader2 } from "lucide-react";
import { updateUserEmail } from "@/actions/admin";
import { toast } from "sonner";

export function EditUserDialog({ user }: { user: any }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(user.email);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateUserEmail(user.id, email);
      setOpen(false);
      toast.success("E-Mail aktualisiert");
    } catch(e) {
      toast.error("Fehler beim Speichern");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm"><Pencil className="w-4 h-4" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Benutzer bearbeiten</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>E-Mail Adresse</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="animate-spin w-4 h-4 mr-2" />} Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}