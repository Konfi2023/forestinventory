import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DeleteAccountSection } from "./_components/DeleteAccountSection";

export default async function AccountSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return redirect("/api/auth/signin/keycloak");

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Mein Account</h3>
        <p className="text-sm text-slate-500 mt-1">
          Verwalten Sie Ihren persönlichen Account.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">E-Mail-Adresse</p>
        <p className="text-sm text-slate-500">{session.user.email}</p>
      </div>

      <hr className="border-slate-200" />

      <DeleteAccountSection email={session.user.email} />
    </div>
  );
}
