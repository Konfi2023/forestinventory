"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignInButton({ callbackUrl }: { callbackUrl: string }) {
  return (
    <Button className="w-full" onClick={() => signIn("keycloak", { callbackUrl })}>
      Jetzt Einloggen
    </Button>
  );
}
