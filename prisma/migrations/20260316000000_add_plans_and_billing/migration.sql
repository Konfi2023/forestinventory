-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('FREE', 'TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxHectares" DOUBLE PRECISION,
    "maxUsers" INTEGER,
    "monthlyPriceId" TEXT,
    "yearlyPriceId" TEXT,
    "monthlyPrice" DOUBLE PRECISION,
    "yearlyPrice" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");

-- AlterTable: Convert subscriptionStatus from String to Enum
-- Step 1: Add new enum column
ALTER TABLE "Organization" ADD COLUMN "subscriptionStatus_new" "SubscriptionStatus" NOT NULL DEFAULT 'FREE';

-- Step 2: Migrate existing data
UPDATE "Organization"
SET "subscriptionStatus_new" = CASE
    WHEN "subscriptionStatus" = 'ACTIVE' THEN 'ACTIVE'::"SubscriptionStatus"
    WHEN "subscriptionStatus" = 'TRIAL' THEN 'TRIAL'::"SubscriptionStatus"
    WHEN "subscriptionStatus" = 'PAST_DUE' THEN 'PAST_DUE'::"SubscriptionStatus"
    WHEN "subscriptionStatus" = 'CANCELED' THEN 'CANCELED'::"SubscriptionStatus"
    ELSE 'FREE'::"SubscriptionStatus"
END;

-- Step 3: Drop old column and rename new one
ALTER TABLE "Organization" DROP COLUMN "subscriptionStatus";
ALTER TABLE "Organization" RENAME COLUMN "subscriptionStatus_new" TO "subscriptionStatus";

-- Add new Organization fields
ALTER TABLE "Organization"
    ADD COLUMN "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "stripeSubscriptionId" TEXT,
    ADD COLUMN "stripePriceId" TEXT,
    ADD COLUMN "planId" TEXT,
    ADD COLUMN "planInterval" TEXT,
    ADD COLUMN "trialEndsAt" TIMESTAMP(3),
    ADD COLUMN "currentPeriodEnd" TIMESTAMP(3),
    ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "customAreaLimit" DOUBLE PRECISION,
    ADD COLUMN "customUserLimit" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_stripeSubscriptionId_key" ON "Organization"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "Plan"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
