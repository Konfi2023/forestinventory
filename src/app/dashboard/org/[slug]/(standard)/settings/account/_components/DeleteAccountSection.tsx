"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { deleteAccount } from "@/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function DeleteAccountSection({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [inputEmail, setInputEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteAccount(inputEmail);
      toast.success("Account wurde gelöscht.");
      const res = await fetch('/api/auth/keycloak-logout?callbackUrl=/');
      const { url: keycloakLogoutUrl } = await res.json();
      await signOut({ redirect: false });
      window.location.href = keycloakLogoutUrl;
    } catch (e: any) {
      toast.error(e.message || "Fehler beim Löschen");
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-red-200 bg-red-50/50 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
        <div>
          <h3 className="font-semibold text-slate-900">Account löschen</h3>
          <p className="text-sm text-slate-600 mt-1">
            Löscht Ihren Account und alle persönlichen Daten dauerhaft und
            DSGVO-konform. Zugewiesene Aufgaben werden auf „Nicht zugewiesen"
            zurückgesetzt. Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); setInputEmail(""); }}>
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Account dauerhaft löschen
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Account wirklich löschen?</DialogTitle>
            <DialogDescription>
              Alle persönlichen Daten werden unwiderruflich gelöscht. Zur
              Bestätigung geben Sie bitte Ihre E-Mail-Adresse ein:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="confirm-email">E-Mail-Adresse</Label>
            <Input
              id="confirm-email"
              type="email"
              placeholder={email}
              value={inputEmail}
              onChange={(e) => setInputEmail(e.target.value)}
              autoComplete="off"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading || inputEmail.toLowerCase() !== email.toLowerCase()}
            >
              {loading ? "Wird gelöscht…" : "Account löschen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
