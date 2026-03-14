"use client";

import { Suspense } from "react";
import { signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

function SignOutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  return (
    <div className="flex flex-col gap-3">
      <Button
        className="w-full bg-slate-900 hover:bg-slate-700"
        onClick={() => signOut({ callbackUrl })}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Ja, abmelden
      </Button>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => router.back()}
      >
        Abbrechen
      </Button>
    </div>
  );
}

export default function SignOutPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center space-y-6">
        <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center mx-auto">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 14l-5-10-5 10"/>
            <path d="M13 18l-1-4-1 4"/>
            <path d="M7 14l-3 6h16l-3-6"/>
            <line x1="12" y1="18" x2="12" y2="21"/>
            <line x1="9" y1="21" x2="15" y2="21"/>
          </svg>
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-900">Abmelden?</h1>
          <p className="text-sm text-slate-500">Sie werden von Forest Inventory abgemeldet.</p>
        </div>

        <Suspense fallback={<div className="h-20" />}>
          <SignOutContent />
        </Suspense>
      </div>
    </div>
  );
}
