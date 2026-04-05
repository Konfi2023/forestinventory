"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createOrganization } from "@/actions/organization";
import { Loader2, Building2, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { OrgType } from "@prisma/client";

export function CreateOrgForm() {
  const t = useTranslations("CreateOrg");
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const STEPS = [
    { id: 1, title: t("step1Title"), desc: t("step1Desc") },
    { id: 2, title: t("step2Title"), desc: t("step2Desc") },
  ];

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    orgType: "PRIVATE_OWNER" as OrgType,
    totalHectares: "",
    legalName: "",
    vatId: "",
    street: "",
    zip: "",
    city: "",
    country: "Deutschland"
  });

  const updateData = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (key === "name" && step === 1) {
      const autoSlug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      setFormData(prev => ({ ...prev, name: value, slug: autoSlug }));
    }
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.name || formData.name.length < 3) {
        toast.error(t("nameMinLength"));
        return false;
      }
      if (!formData.slug) return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await createOrganization({
        ...formData,
        totalHectares: parseFloat(formData.totalHectares) || 0
      });
    } catch (e: any) {
      toast.error(e.message || t("createError"));
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto mt-6 shadow-xl border-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                <Building2 size={20}/>
            </div>
            <div className="text-xs font-medium text-slate-400">
                {t("stepOf", { step })}
            </div>
        </div>
        <CardTitle>{STEPS[step - 1].title}</CardTitle>
        <CardDescription>{STEPS[step - 1].desc}</CardDescription>

        {/* Progress Bar */}
        <div className="h-1 w-full bg-slate-100 mt-4 rounded-full overflow-hidden">
            <div
                className="h-full bg-slate-900 transition-all duration-500 ease-in-out"
                style={{ width: `${(step / 2) * 100}%` }}
            />
        </div>
      </CardHeader>

      <CardContent className="space-y-4 py-4 min-h-[220px]">

        {/* --- SCHRITT 1: BASIC --- */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <Label>{t("orgName")}</Label>
              <Input
                value={formData.name}
                onChange={(e) => updateData("name", e.target.value)}
                placeholder={t("orgNamePlaceholder")}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>{t("slugLabel")}</Label>
              <div className="flex items-center">
                  <span className="text-sm text-slate-400 bg-slate-50 border border-r-0 rounded-l-md px-3 h-10 flex items-center">
                      forest-app.de/
                  </span>
                  <Input
                    value={formData.slug}
                    onChange={(e) => updateData("slug", e.target.value)}
                    className="rounded-l-none font-mono text-sm"
                  />
              </div>
              <p className="text-[10px] text-muted-foreground">{t("slugHint")}</p>
            </div>
          </div>
        )}

        {/* --- SCHRITT 2: PROFIL --- */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <Label>{t("orgType")}</Label>
              <Select value={formData.orgType} onValueChange={(val) => updateData("orgType", val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIVATE_OWNER">{t("typePrivate")}</SelectItem>
                  <SelectItem value="FORESTRY_COMPANY">{t("typeForestry")}</SelectItem>
                  <SelectItem value="SERVICE_PROVIDER">{t("typeService")}</SelectItem>
                  <SelectItem value="ASSOCIATION">{t("typeAssociation")}</SelectItem>
                  <SelectItem value="PUBLIC">{t("typePublic")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("areaLabel")}</Label>
              <div className="relative">
                <Input
                    type="number"
                    value={formData.totalHectares}
                    onChange={(e) => updateData("totalHectares", e.target.value)}
                    placeholder="50"
                />
                <span className="absolute right-3 top-2.5 text-sm text-slate-400">ha</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{t("areaHint")}</p>
            </div>
          </div>
        )}

      </CardContent>

      <CardFooter className="flex justify-between border-t p-6 bg-slate-50/50">
        {step > 1 ? (
            <Button variant="ghost" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" /> {t("back")}
            </Button>
        ) : (
            <div></div>
        )}

        {step < 2 ? (
            <Button onClick={handleNext}>
                {t("next")} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
        ) : (
            <Button onClick={handleSubmit} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-2"/> {t("create")}</>}
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}
