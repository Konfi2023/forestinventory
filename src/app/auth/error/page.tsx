"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl");

  const isExpired = error === "OAuthCallback" || error === "OAuthSignin";
  const returnUrl = callbackUrl ?? "/";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center space-y-6">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7 text-red-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-900">Sitzung abgelaufen</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            {isExpired
              ? "Ihre Sitzung ist abgelaufen. Bitte starten Sie den Vorgang neu — Ihre Einladung ist weiterhin gültig."
              : "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut."}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link href={returnUrl}>
            <Button className="w-full bg-slate-900 hover:bg-slate-700">
              Neu starten
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full">
              Zur Startseite
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <ErrorContent />
    </Suspense>
  );
}
