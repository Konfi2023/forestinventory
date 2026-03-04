"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { updateOrganization } from "@/actions/organization"; // Diese Action erstellen wir gleich

interface Props {
  organization: any;
}

export function GeneralSettingsForm({ organization }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    try {
      await updateOrganization(organization.slug, formData);
      toast.success("Einstellungen gespeichert");
    } catch (e: any) {
      toast.error(e.message || "Fehler beim Speichern");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form action={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Betriebsdaten</CardTitle>
          <CardDescription>
            Diese Daten erscheinen auf Rechnungen und Dokumenten.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Rufname (Dashboard)</Label>
              <Input id="name" name="name" defaultValue={organization.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legalName">Offizieller Firmenname</Label>
              <Input id="legalName" name="legalName" defaultValue={organization.legalName || ""} placeholder={organization.name} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="street">Straße & Hausnummer</Label>
            <Input id="street" name="street" defaultValue={organization.street || ""} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
               <Label htmlFor="zip">PLZ</Label>
               <Input id="zip" name="zip" defaultValue={organization.zip || ""} />
            </div>
            <div className="space-y-2 col-span-2">
               <Label htmlFor="city">Ort</Label>
               <Input id="city" name="city" defaultValue={organization.city || ""} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label htmlFor="vatId">USt-IdNr.</Label>
               <Input id="vatId" name="vatId" defaultValue={organization.vatId || ""} placeholder="DE..." />
             </div>
             <div className="space-y-2">
               <Label htmlFor="billingEmail">Rechnungs-E-Mail</Label>
               <Input id="billingEmail" name="billingEmail" type="email" defaultValue={organization.billingEmail || ""} />
             </div>
          </div>

        </CardContent>
        <CardFooter className="border-t px-6 py-4 bg-slate-50/50 flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Speichern
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}