import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

// Server Action um den Invite anzunehmen
async function acceptInvite(token: string) {
  "use server";
  
  const session = await getServerSession(authOptions);
  if (!session?.user) return; 

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { organization: true }
  });

  if (!invite || invite.expiresAt < new Date()) {
    throw new Error("Einladung ungültig oder abgelaufen");
  }

  // User zur Org hinzufügen
  await prisma.membership.create({
    data: {
      userId: session.user.id,
      organizationId: invite.organizationId,
      roleId: invite.roleId,
    }
  });

  // Invite löschen
  await prisma.invite.delete({ where: { token } });

  // Zur Org weiterleiten
  redirect(`/dashboard/org/${invite.organization.slug}`);
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getServerSession(authOptions);

  // 1. Token validieren
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { 
      organization: true,
      role: true
    }
  });

  // FEHLERBEHANDLUNG (Hier war der Tippfehler)
  if (!invite || invite.expiresAt < new Date()) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Card className="w-[400px]">
          <CardHeader className="text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Einladung ungültig</CardTitle>
            <CardDescription>
              Dieser Link ist abgelaufen oder existiert nicht mehr.
            </CardDescription> {/* <--- HIER WAR DER FEHLER KORRIGIERT */}
          </CardHeader>
          <CardContent className="flex justify-center">
            <Link href="/">
              <Button variant="outline">Zur Startseite</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ERFOLGSFALL
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <Card className="w-[450px]">
        <CardHeader className="text-center">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <CardTitle>Einladung zu {invite.organization.name}</CardTitle>
          <CardDescription>
            Sie wurden eingeladen, als <strong>{invite.role.name}</strong> beizutreten.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-100 p-3 rounded-md text-sm text-center text-slate-600">
            Einladung für: <span className="font-semibold text-slate-900">{invite.email}</span>
          </div>

          {!session ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Bitte loggen Sie sich ein, um die Einladung anzunehmen.
              </p>
              <Link href={`/api/auth/signin?callbackUrl=/invite/${token}`}>
                <Button className="w-full">Jetzt Einloggen / Registrieren</Button>
              </Link>
            </div>
          ) : (
             <div className="text-center space-y-3">
               <p className="text-sm text-muted-foreground">
                 Angemeldet als: <strong>{session.user.email}</strong>
               </p>
               {session.user.email !== invite.email && (
                 <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                   Hinweis: Ihre eingeloggte Email stimmt nicht mit der Einladung überein. 
                   Sie können trotzdem beitreten.
                 </p>
               )}
               <form action={acceptInvite.bind(null, token)}>
                 <Button className="w-full bg-green-600 hover:bg-green-700">
                   Einladung annehmen & Beitreten
                 </Button>
               </form>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}