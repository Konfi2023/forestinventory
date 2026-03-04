"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner"; // oder alert nutzen

interface Props {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmString: string; // Die E-Mail des Admins
  onConfirm: () => Promise<void>;
}

export function DeleteConfirmDialog({ trigger, title, description, confirmString, onConfirm }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isMatch = input === confirmString;

  const handleConfirm = async () => {
    if (!isMatch) return;
    setIsLoading(true);
    try {
      await onConfirm();
      setOpen(false);
      toast.success("Erfolgreich gelöscht");
    } catch (e) {
      toast.error("Fehler beim Löschen");
    } finally {
      setIsLoading(false);
      setInput("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <AlertTriangle className="h-6 w-6" />
            <DialogTitle className="text-xl">Achtung: Unwiderruflich!</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {title}
            <br /><br />
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <Label>Zur Bestätigung bitte deine E-Mail eingeben:</Label>
          <div className="p-2 bg-slate-100 rounded text-sm font-mono text-center select-all">
            {confirmString}
          </div>
          <Input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder={confirmString}
            className="border-red-200 focus-visible:ring-red-500"
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isLoading}>Abbrechen</Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm} 
            disabled={!isMatch || isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Endgültig löschen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}