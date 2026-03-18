import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureDbUser } from "@/lib/ensure-user";
import { checkKeycloakUserExists } from "@/lib/keycloak-admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { SignInButton } from "./SignInButton";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getServerSession(authOptions);

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { organization: true, role: true },
  });

  if (!invite || invite.expiresAt < new Date()) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Card className="w-[400px]">
          <CardHeader className="text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Einladung ungültig</CardTitle>
            <CardDescription>
              Dieser Link ist abgelaufen oder existiert nicht mehr.
            </CardDescription>
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

  const emailMismatch =
    session && session.user.email?.toLowerCase() !== invite.email.toLowerCase();

  // ── Auto-Accept: eingeloggt mit korrekter E-Mail → sofort annehmen ──────────
  if (session && !emailMismatch) {
    const userId = await ensureDbUser(session);

    // Idempotent: überspringen wenn Mitgliedschaft bereits existiert
    const existing = await prisma.membership.findFirst({
      where: { userId, organizationId: invite.organizationId },
    });

    if (!existing) {
      await prisma.membership.create({
        data: {
          userId,
          organizationId: invite.organizationId,
          roleId: invite.roleId,
        },
      });
    }

    // Einladung löschen (catch falls bereits gelöscht)
    await prisma.invite.delete({ where: { token } }).catch(() => {});

    redirect(`/dashboard/org/${invite.organization.slug}`);
  }

  // ── Neuer Nutzer: DB + Keycloak prüfen ────────────────────────────────────
  const dbUser = await prisma.user.findUnique({
    where: { email: invite.email.toLowerCase() },
    select: { id: true },
  });
  const isNewUser = !dbUser && !(await checkKeycloakUserExists(invite.email));

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <Card className="w-[450px]">
        <CardHeader className="text-center">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <CardTitle>Einladung zu {invite.organization.name}</CardTitle>
          <CardDescription>
            Sie wurden als <strong>{invite.role.name}</strong> eingeladen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-100 p-3 rounded-md text-sm text-center text-slate-600">
            Einladung für:{" "}
            <span className="font-semibold text-slate-900">{invite.email}</span>
          </div>

          {emailMismatch ? (
            <div className="text-center space-y-3">
              <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Sie sind als <strong>{session!.user.email}</strong> eingeloggt. Diese
                  Einladung gilt nur für <strong>{invite.email}</strong>. Bitte melden Sie
                  sich ab und loggen Sie sich mit der richtigen Adresse ein.
                </span>
              </div>
              <Link href={`/signout?callbackUrl=/invite/${token}`}>
                <Button variant="outline" className="w-full">
                  Abmelden &amp; neu einloggen
                </Button>
              </Link>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                {isNewUser ? (
                  <>
                    Erstellen Sie einen Account mit <strong>{invite.email}</strong>, um der
                    Einladung beizutreten.
                  </>
                ) : (
                  <>
                    Bitte loggen Sie sich mit <strong>{invite.email}</strong> ein. Die
                    Einladung wird danach automatisch angenommen.
                  </>
                )}
              </p>
              <SignInButton
                callbackUrl={`/invite/${token}`}
                email={invite.email}
                isNewUser={isNewUser}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
