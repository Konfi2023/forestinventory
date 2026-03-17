import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { ANNUAL_DISCOUNT_COUPON_ID, TRIAL_DAYS } from "@/lib/pricing-config";
import crypto from "crypto";

function makeCheckoutToken(orgId: string, planId: string): string {
  return crypto
    .createHmac("sha256", process.env.CRON_SECRET!)
    .update(`${orgId}:${planId}`)
    .digest("hex")
    .slice(0, 32);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const orgId  = searchParams.get("org");
  const planId = searchParams.get("plan");
  const token  = searchParams.get("t");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!orgId || !planId || !token) {
    return NextResponse.redirect(`${appUrl}/dashboard`);
  }

  // HMAC validieren
  const expected = makeCheckoutToken(orgId, planId);
  if (token !== expected) {
    return new NextResponse("Ungültiger Link.", { status: 403 });
  }

  const [org, plan] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId } }),
    prisma.plan.findUnique({ where: { id: planId } }),
  ]);

  if (!org || !plan?.yearlyPriceId) {
    return NextResponse.redirect(`${appUrl}/dashboard`);
  }

  // Stripe-Customer sicherstellen
  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: org.billingEmail || undefined,
      name: org.name,
      metadata: { orgId: org.id },
    });
    customerId = customer.id;
    await prisma.organization.update({
      where: { id: orgId },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: plan.yearlyPriceId, quantity: 1 }],
    discounts: [{ coupon: ANNUAL_DISCOUNT_COUPON_ID }],
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: { orgId: org.id, interval: "yearly" },
    },
    success_url: `${appUrl}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/dashboard/org/${org.slug}/billing`,
    metadata: { orgId: org.id, interval: "yearly" },
  });

  if (!session.url) {
    return NextResponse.redirect(`${appUrl}/dashboard/org/${org.slug}/billing`);
  }

  return NextResponse.redirect(session.url);
}
