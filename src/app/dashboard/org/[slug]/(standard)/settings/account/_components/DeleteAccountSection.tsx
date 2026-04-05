"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("SettingsPage.account");
  const [open, setOpen] = useState(false);
  const [inputEmail, setInputEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteAccount(inputEmail);
      toast.success(t("deleted"));
      const res = await fetch('/api/auth/keycloak-logout?callbackUrl=/');
      const { url: keycloakLogoutUrl } = await res.json();
      await signOut({ redirect: false });
      window.location.href = keycloakLogoutUrl;
    } catch (e: any) {
      toast.error(e.message || t("deleteError"));
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-red-200 bg-red-50/50 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
        <div>
          <h3 className="font-semibold text-slate-900">{t("title")}</h3>
          <p className="text-sm text-slate-600 mt-1">
            {t("description")}
          </p>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); setInputEmail(""); }}>
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            {t("deleteButton")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("dialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="confirm-email">{t("emailLabel")}</Label>
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
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading || inputEmail.toLowerCase() !== email.toLowerCase()}
            >
              {loading ? t("deleting") : t("confirmDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
