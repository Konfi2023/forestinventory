'use server';

import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { requireSystemAdmin } from '@/lib/admin-auth';
import { revalidatePath } from 'next/cache';

export interface CreateCouponInput {
  code: string;
  description?: string;
  percentOff?: number;
  amountOff?: number;
  maxRedemptions?: number;
  expiresAt?: string; // ISO date string
}

export async function createCoupon(input: CreateCouponInput) {
  await requireSystemAdmin();

  if (!input.code.trim()) throw new Error('Code darf nicht leer sein');
  if (!input.percentOff && !input.amountOff) throw new Error('Rabatt (% oder €) muss angegeben werden');
  if (input.percentOff && input.amountOff) throw new Error('Nur einen Rabatttyp angeben');

  const code = input.code.toUpperCase().trim();

  // Stripe Coupon erstellen
  const couponParams: any = {
    duration: 'once',
    ...(input.percentOff ? { percent_off: input.percentOff } : {}),
    ...(input.amountOff ? { amount_off: Math.round(input.amountOff * 100), currency: 'eur' } : {}),
    ...(input.maxRedemptions ? { max_redemptions: input.maxRedemptions } : {}),
    ...(input.expiresAt ? { redeem_by: Math.floor(new Date(input.expiresAt).getTime() / 1000) } : {}),
    metadata: { source: 'admin-dashboard', description: input.description || '' },
  };

  const stripeCoupon = await stripe.coupons.create(couponParams);

  // Stripe Promotion Code (der eigentliche Code den Kunden eingeben)
  const promoCodeParams: any = {
    coupon: stripeCoupon.id,
    code,
    ...(input.maxRedemptions ? { max_redemptions: input.maxRedemptions } : {}),
    ...(input.expiresAt ? { expires_at: Math.floor(new Date(input.expiresAt).getTime() / 1000) } : {}),
  };

  const promoCode = await stripe.promotionCodes.create(promoCodeParams);

  // In DB speichern
  await (prisma as any).coupon.create({
    data: {
      code,
      description: input.description || null,
      stripeCouponId: stripeCoupon.id,
      stripePromotionCodeId: promoCode.id,
      percentOff: input.percentOff ?? null,
      amountOff: input.amountOff ? Math.round(input.amountOff * 100) : null,
      maxRedemptions: input.maxRedemptions ?? null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    },
  });

  revalidatePath('/admin/coupons');
  return { success: true };
}

export async function listCoupons() {
  await requireSystemAdmin();

  // Aus Stripe live Nutzungszahlen holen
  const coupons = await (prisma as any).coupon.findMany({
    orderBy: { createdAt: 'desc' },
  });

  // timesRedeemed live von Stripe nachladen
  const enriched = await Promise.all(
    coupons.map(async (c: any) => {
      try {
        const promo = await stripe.promotionCodes.retrieve(c.stripePromotionCodeId);
        return { ...c, timesRedeemed: promo.times_redeemed, active: promo.active };
      } catch {
        return c;
      }
    })
  );

  return enriched;
}

export async function deactivateCoupon(id: string) {
  await requireSystemAdmin();

  const coupon = await (prisma as any).coupon.findUnique({ where: { id } });
  if (!coupon) throw new Error('Gutschein nicht gefunden');

  // In Stripe deaktivieren
  await stripe.promotionCodes.update(coupon.stripePromotionCodeId, { active: false });

  await (prisma as any).coupon.update({
    where: { id },
    data: { active: false },
  });

  revalidatePath('/admin/coupons');
}
