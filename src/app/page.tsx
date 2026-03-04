import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);

  // Wenn eingeloggt -> Sofort zum Dashboard weiterleiten
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-50">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Forest Inventory v1</h1>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-md border text-center">
        <div className="space-y-4">
          <p className="text-slate-600">Bitte einloggen um fortzufahren.</p>
          <Link href="/api/auth/signin">
            <Button size="lg">Login via Keycloak</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}