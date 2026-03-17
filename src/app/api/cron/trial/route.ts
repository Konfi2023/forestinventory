import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SENDER = process.env.RESEND_FROM!;

function makeCheckoutToken(orgId: string, planId: string): string {
  return crypto
    .createHmac("sha256", process.env.CRON_SECRET!)
    .update(`${orgId}:${planId}`)
    .digest("hex")
    .slice(0, 32);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const now = new Date();

  // ── 1. Abgelaufene Trials → CANCELED ──────────────────────────────────────
  const expired = await prisma.organization.findMany({
    where: {
      subscriptionStatus: SubscriptionStatus.TRIAL,
      stripeSubscriptionId: null,
      trialEndsAt: { lt: now },
    },
    select: { id: true },
  });

  if (expired.length > 0) {
    await prisma.organization.updateMany({
      where: { id: { in: expired.map((o) => o.id) } },
      data: { subscriptionStatus: SubscriptionStatus.CANCELED },
    });
    console.log(`[trial-cron] ${expired.length} Trials abgelaufen → CANCELED`);
  }

  // ── 2. Erinnerungsemails: Trial endet in 2–4 Tagen ────────────────────────
  const windowStart = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const windowEnd   = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

  const reminderOrgs = await prisma.organization.findMany({
    where: {
      subscriptionStatus: SubscriptionStatus.TRIAL,
      stripeSubscriptionId: null,
      trialEndsAt: { gte: windowStart, lte: windowEnd },
    },
    include: {
      plan: true,
      members: {
        where: { role: { name: "Administrator" } },
        include: { user: { select: { email: true, firstName: true } } },
      },
    },
  });

  // Fallback-Plan ermitteln (Pro)
  const proPlan = await prisma.plan.findFirst({
    where: { name: "Pro", isActive: true },
  });

  let emailsSent = 0;

  for (const org of reminderOrgs) {
    const plan = org.plan ?? proPlan;
    if (!plan?.yearlyPriceId) continue;

    const token = makeCheckoutToken(org.id, plan.id);
    const checkoutUrl =
      `${BASE_URL}/api/billing/checkout-redirect` +
      `?org=${org.id}&plan=${plan.id}&t=${token}`;

    const daysLeft = org.trialEndsAt
      ? Math.ceil((org.trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      : 3;

    for (const member of org.members) {
      const email = member.user.email;
      if (!email) continue;

      const firstName = member.user.firstName || "dort";

      try {
        await resend.emails.send({
          from: SENDER,
          to: email,
          subject: `Noch ${daysLeft} Tage – sichern Sie sich 50 % Rabatt auf Forest Inventory`,
          html: `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#15803d;padding:28px 40px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">Forest Inventory</p>
              <p style="margin:4px 0 0;font-size:13px;color:#bbf7d0;">Professionelle Forstwirtschaft digital</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;font-size:15px;color:#0f172a;">Hallo ${firstName},</p>
              <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
                Ihr kostenloser Testzeitraum für <strong style="color:#0f172a;">${org.name}</strong>
                endet in <strong style="color:#15803d;">${daysLeft} Tagen</strong>.
              </p>

              <!-- Highlight box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:0.05em;">
                      Exklusives Angebot
                    </p>
                    <p style="margin:0 0 4px;font-size:22px;font-weight:700;color:#0f172a;">
                      50&nbsp;% Rabatt im ersten Jahr
                    </p>
                    <p style="margin:0;font-size:13px;color:#64748b;">
                      Nur beim Abschluss des Jahresabos über diesen Link.
                      Ab dem zweiten Jahr gilt der reguläre Preis.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
                Klicken Sie auf den Button, um direkt zum Checkout zu gelangen.
                Der Rabatt wird automatisch angewendet – kein Gutscheincode nötig.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#15803d;border-radius:10px;">
                    <a href="${checkoutUrl}"
                       style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.01em;">
                      Jetzt 50&nbsp;% Rabatt sichern →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px;font-size:13px;color:#94a3b8;">
                Bevorzugen Sie die monatliche Abrechnung?
                <a href="${BASE_URL}/dashboard/org/${org.slug}/billing"
                   style="color:#15803d;text-decoration:none;">Zur Abrechnung</a>
              </p>
              <p style="margin:0;font-size:13px;color:#94a3b8;">
                Nach dem Testzeitraum werden Ihre Daten noch 14 Tage aufbewahrt.
                Sie können jederzeit kündigen.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                © Forest Inventory · Sie erhalten diese E-Mail, weil Sie Administrator von <em>${org.name}</em> sind.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
          `.trim(),
        });
        emailsSent++;
      } catch (err) {
        console.error(`[trial-cron] E-Mail an ${email} fehlgeschlagen:`, err);
      }
    }
  }

  console.log(`[trial-cron] ${emailsSent} Erinnerungsemails gesendet.`);

  return NextResponse.json({
    expired: expired.length,
    reminderOrgs: reminderOrgs.length,
    emailsSent,
  });
}
