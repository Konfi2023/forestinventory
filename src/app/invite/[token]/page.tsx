import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { SignInButton } from "./SignInButton";

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

  if (invite.email.toLowerCase() !== session.user.email?.toLowerCase()) {
    throw new Error("Diese Einladung gilt für eine andere E-Mail-Adresse.");
  }

  await prisma.membership.create({
    data: {
      userId: session.user.id,
      organizationId: invite.organizationId,
      roleId: invite.roleId,
    }
  });

  await prisma.invite.delete({ where: { token } });

  redirect(`/dashboard/org/${invite.organization.slug}`);
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getServerSession(authOptions);

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { organization: true, role: true }
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

  const dbUser = await prisma.user.findUnique({
    where: { email: invite.email.toLowerCase() },
    select: { id: true },
  });
  const isNewUser = !dbUser;

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
            Einladung für: <span className="font-semibold text-slate-900">{invite.email}</span>
          </div>

          {!session ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                {isNewUser
                  ? <>Erstellen Sie einen Account mit <strong>{invite.email}</strong>, um der Einladung beizutreten.</>
                  : <>Bitte loggen Sie sich mit <strong>{invite.email}</strong> ein, um die Einladung anzunehmen.</>
                }
              </p>
              <SignInButton callbackUrl={`/invite/${token}`} email={invite.email} isNewUser={isNewUser} />
            </div>
          ) : emailMismatch ? (
            <div className="text-center space-y-3">
              <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Sie sind als <strong>{session.user.email}</strong> eingeloggt. Diese Einladung gilt nur für{" "}
                  <strong>{invite.email}</strong>. Bitte melden Sie sich ab und loggen Sie sich mit der richtigen Adresse ein.
                </span>
              </div>
              <Link href={`/signout?callbackUrl=/invite/${token}`}>
                <Button variant="outline" className="w-full">Abmelden & neu einloggen</Button>
              </Link>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Angemeldet als: <strong>{session.user.email}</strong>
              </p>
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
