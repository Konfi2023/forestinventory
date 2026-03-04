import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function requireSystemAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/api/auth/signin");
  }

  // Live-Check gegen die DB (Session könnte alt sein)
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isSystemAdmin: true },
  });

  if (!user || !user.isSystemAdmin) {
    // Entweder 404 oder Redirect zur Startseite
    redirect("/"); 
  }

  return session;
}