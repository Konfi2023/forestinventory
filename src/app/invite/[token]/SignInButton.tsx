"use client";

import { signIn } from "next-auth/react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus } from "lucide-react";

interface Props {
  callbackUrl: string;
  email: string;
  isNewUser: boolean;
}

export function SignInButton({ callbackUrl, email, isNewUser }: Props) {
  const locale = useLocale();

  if (isNewUser) {
    return (
      <Button
        className="w-full bg-green-600 hover:bg-green-700"
        onClick={() => signIn("keycloak-register", { callbackUrl }, { login_hint: email, ui_locales: locale })}
      >
        <UserPlus className="w-4 h-4 mr-2" />
        Kostenlosen Account erstellen
      </Button>
    );
  }

  return (
    <Button
      className="w-full"
      onClick={() => signIn("keycloak", { callbackUrl }, { login_hint: email, ui_locales: locale })}
    >
      <LogIn className="w-4 h-4 mr-2" />
      Jetzt Einloggen
    </Button>
  );
}
