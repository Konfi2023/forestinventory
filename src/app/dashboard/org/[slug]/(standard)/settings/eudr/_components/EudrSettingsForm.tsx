"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Shield, ShieldCheck, ShieldAlert,
  Loader2,
  Save, Info, ExternalLink, HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { saveEudrApiSettings, testEudrApiConnection } from "@/actions/eudr-settings";
import { EUDR_ENDPOINTS } from "@/lib/eudr-soap";

function EoriTooltip() {
  const t = useTranslations("SettingsPage.eudr");
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="text-slate-400 hover:text-slate-600 transition-colors"
      >
        <HelpCircle size={14} />
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 z-50 bg-slate-800 text-white text-xs rounded-lg p-3 shadow-xl">
          <p className="font-semibold mb-1">{t("eoriTooltipTitle")}</p>
          <p className="text-slate-300 leading-relaxed">
            {t("eoriTooltipDesc")}
          </p>
          <p className="text-slate-400 mt-2">
            {t("eoriTooltipFormat")}{" "}
            <span className="font-mono text-white">DE123456789</span>
          </p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </div>
  );
}

interface OrgData {
  slug: string;
  eudrActivityType: string | null;
  eoriNumber: string | null;
  eudrApiUrl: string | null;
  eudrApiUsername: string | null;
  eudrApiPassword: string | null;
  eudrApiClientId: string | null;
  eudrApiEnvironment: string | null;
  eudrApiEnabled: boolean;
}

interface Props {
  organization: OrgData;
}

export function EudrSettingsForm({ organization }: Props) {
  const t = useTranslations("SettingsPage.eudr");
  const orgSlug = organization.slug;

  const ACTIVITY_TYPES = [
    { value: "DOMESTIC", label: t("domesticLabel"), desc: t("domesticDesc") },
    { value: "IMPORT", label: t("importLabel"), desc: t("importDesc") },
    { value: "EXPORT", label: t("exportLabel"), desc: t("exportDesc") },
  ];

  // ── Grundeinstellungen
  const [activity, setActivity] = useState(organization.eudrActivityType ?? "DOMESTIC");
  const [eori,     setEori]     = useState(organization.eoriNumber ?? "");

  const [saving, setSaving] = useState(false);
  const needsEori = activity === "IMPORT" || activity === "EXPORT";

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveEudrApiSettings(orgSlug, {
        eudrActivityType: activity,
        eoriNumber:       eori || undefined,
      });
      toast.success(t("saved"));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── Grundeinstellungen ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <Shield size={15} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800">{t("basicSettings")}</h2>
        </div>
        <div className="p-4 space-y-4">

          {/* Aktivitätstyp */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">{t("activityType")}</Label>
            <div className="space-y-2">
              {ACTIVITY_TYPES.map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    activity === opt.value
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="activityType"
                    value={opt.value}
                    checked={activity === opt.value}
                    onChange={() => setActivity(opt.value)}
                    className="mt-0.5 accent-emerald-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{opt.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* EORI-Nummer */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              {t("eoriNumber")}
              <EoriTooltip />
              {!needsEori && (
                <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{t("eoriOptional")}</span>
              )}
              {needsEori && <span className="text-red-500 text-xs">*</span>}
            </Label>
            <Input
              value={eori}
              onChange={e => setEori(e.target.value)}
              placeholder="DE123456789012345"
              className={`font-mono text-sm ${needsEori && !eori ? "border-amber-300" : ""}`}
            />
          </div>
        </div>
      </div>


      {/* ── Speichern ───────────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6">
          {saving
            ? <><Loader2 size={14} className="animate-spin mr-1.5" />{t("saving")}</>
            : <><Save size={14} className="mr-1.5" />{t("saveSettings")}</>
          }
        </Button>
      </div>

    </div>
  );
}
