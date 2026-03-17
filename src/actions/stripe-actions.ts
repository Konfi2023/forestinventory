"use server";

import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ANNUAL_DISCOUNT_COUPON_ID, TRIAL_DAYS } from "@/lib/pricing-config";

export async function createCheckoutSession(
  priceId: string,
  orgId: string,
  interval: "monthly" | "yearly"
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  });
  if (!org) throw new Error("Organisation nicht gefunden");

  // Ensure we have or create a Stripe customer
  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: org.billingEmail || session.user.email || undefined,
      name: org.name,
      metadata: { orgId: org.id },
    });
    customerId = customer.id;
    await prisma.organization.update({
      where: { id: orgId },
      data: { stripeCustomerId: customerId },
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const checkoutParams: any = {
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: { orgId: org.id, interval },
    },
    success_url: `${appUrl}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/onboarding?step=3`,
    metadata: { orgId: org.id, interval },
  };

  // Add first-year annual discount coupon for yearly plans
  if (interval === "yearly") {
    checkoutParams.discounts = [{ coupon: ANNUAL_DISCOUNT_COUPON_ID }];
  }

  const checkoutSession = await stripe.checkout.sessions.create(checkoutParams);

  return { url: checkoutSession.url };
}

export async function createCustomerPortal(orgId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  });
  if (!org?.stripeCustomerId) throw new Error("Kein Stripe-Kunde gefunden");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${appUrl}/dashboard`,
  });

  return { url: portalSession.url };
}
