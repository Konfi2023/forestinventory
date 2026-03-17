import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.orgId;
        const interval = session.metadata?.interval as "monthly" | "yearly" | undefined;

        if (!orgId) break;

        const subscriptionId = session.subscription as string;
        let subscription: Stripe.Subscription | null = null;
        if (subscriptionId) {
          subscription = await stripe.subscriptions.retrieve(subscriptionId);
        }

        const sub = subscription as any;
        await prisma.organization.update({
          where: { id: orgId },
          data: {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscriptionId || null,
            stripePriceId: subscription?.items.data[0]?.price.id || null,
            subscriptionStatus: SubscriptionStatus.ACTIVE,
            planInterval: interval || null,
            currentPeriodEnd: sub?.current_period_end
              ? new Date(sub.current_period_end * 1000)
              : null,
            cancelAtPeriodEnd: sub?.cancel_at_period_end || false,
            onboardingComplete: true,
          },
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata?.orgId;

        if (!orgId) {
          // Try finding org by stripeSubscriptionId
          const org = await prisma.organization.findFirst({
            where: { stripeSubscriptionId: subscription.id },
          });
          if (!org) break;

          await updateOrgSubscription(org.id, subscription);
        } else {
          await updateOrgSubscription(orgId, subscription);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata?.orgId;

        let org;
        if (orgId) {
          org = await prisma.organization.findUnique({ where: { id: orgId } });
        } else {
          org = await prisma.organization.findFirst({
            where: { stripeSubscriptionId: subscription.id },
          });
        }

        if (!org) break;

        await prisma.organization.update({
          where: { id: org.id },
          data: {
            subscriptionStatus: SubscriptionStatus.CANCELED,
            stripeSubscriptionId: null,
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
          },
        });
        break;
      }

      default:
        // Ignore other events
        break;
    }
  } catch (err) {
    console.error("Error processing webhook event:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

async function updateOrgSubscription(orgId: string, subscription: Stripe.Subscription) {
  let status: SubscriptionStatus = SubscriptionStatus.ACTIVE;
  const sub = subscription as any;

  switch (subscription.status) {
    case "active":
      status = SubscriptionStatus.ACTIVE;
      break;
    case "trialing":
      status = SubscriptionStatus.TRIAL;
      break;
    case "past_due":
      status = SubscriptionStatus.PAST_DUE;
      break;
    case "canceled":
    case "unpaid":
      status = SubscriptionStatus.CANCELED;
      break;
    default:
      status = SubscriptionStatus.FREE;
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      subscriptionStatus: status,
      stripePriceId: subscription.items.data[0]?.price.id || null,
      currentPeriodEnd: sub.current_period_end
        ? new Date(sub.current_period_end * 1000)
        : null,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });
}
