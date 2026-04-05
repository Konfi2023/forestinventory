"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { updateOrganization } from "@/actions/organization";

interface Props {
  organization: any;
}

export function GeneralSettingsForm({ organization }: Props) {
  const t = useTranslations("SettingsPage.general");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    try {
      await updateOrganization(organization.slug, formData);
      toast.success(t("saved"));
    } catch (e: any) {
      toast.error(e.message || t("saveError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form action={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            {t("description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("displayName")}</Label>
              <Input id="name" name="name" defaultValue={organization.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legalName">{t("legalName")}</Label>
              <Input id="legalName" name="legalName" defaultValue={organization.legalName || ""} placeholder={organization.name} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="street">{t("street")}</Label>
            <Input id="street" name="street" defaultValue={organization.street || ""} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
               <Label htmlFor="zip">{t("zip")}</Label>
               <Input id="zip" name="zip" defaultValue={organization.zip || ""} />
            </div>
            <div className="space-y-2 col-span-2">
               <Label htmlFor="city">{t("city")}</Label>
               <Input id="city" name="city" defaultValue={organization.city || ""} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label htmlFor="vatId">{t("vatId")}</Label>
               <Input id="vatId" name="vatId" defaultValue={organization.vatId || ""} placeholder="DE..." />
             </div>
             <div className="space-y-2">
               <Label htmlFor="billingEmail">{t("billingEmail")}</Label>
               <Input id="billingEmail" name="billingEmail" type="email" defaultValue={organization.billingEmail || ""} />
             </div>
          </div>

        </CardContent>
        <CardFooter className="border-t px-6 py-4 bg-slate-50/50 flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {t("save")}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}