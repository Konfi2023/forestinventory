"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Loader2 } from "lucide-react";
import { inviteUser } from "@/actions/invites";
import { toast } from "sonner";

type Role = {
  id: string;
  name: string;
};

export function InviteUserDialog({ orgSlug, availableRoles }: { orgSlug: string, availableRoles: Role[] }) {
  const t = useTranslations("TeamAdmin");
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!roleId) {
      toast.error(t("roleRequired"));
      return;
    }

    setIsLoading(true);

    try {
      await inviteUser(orgSlug, email, roleId);
      setOpen(false);
      setEmail("");
      setRoleId("");
      toast.success(t("inviteSent"));
    } catch (error: any) {
      toast.error(error.message || t("inviteError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          {t("inviteButton")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("inviteTitle")}</DialogTitle>
            <DialogDescription>
              {t("inviteDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">{t("emailLabel")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">{t("roleLabel")}</Label>
              <Select onValueChange={setRoleId} value={roleId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("rolePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("sendInvite")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}