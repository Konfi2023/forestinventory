"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export default function OnboardingSuccessPage() {
  const router = useRouter();
  const t = useTranslations("Onboarding.success");

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/dashboard");
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="mb-12">
        <Logo variant="dark" height={28} />
      </div>

      <div className="text-center space-y-4 max-w-md">
        <div className="flex justify-center">
          <CheckCircle2 className="text-green-500" size={80} strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">{t("title")}</h1>
        <p className="text-slate-600 text-lg">
          {t("subtitle")}
        </p>
        <div className="flex justify-center">
          <div className="w-32 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full animate-pulse" style={{ width: "100%" }} />
          </div>
        </div>
      </div>

      <button
        onClick={() => router.push("/dashboard")}
        className="mt-10 px-6 py-3 bg-green-700 text-white rounded-lg font-medium hover:bg-green-800 transition"
      >
        {t("toDashboard")}
      </button>
    </div>
  );
}
