CREATE TABLE "AlertAcknowledgement" (
  "id"          TEXT NOT NULL,
  "alertId"     TEXT NOT NULL,
  "alertType"   TEXT NOT NULL,
  "forestId"    TEXT NOT NULL,
  "forestName"  TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "userEmail"   TEXT NOT NULL,
  "isTest"      BOOLEAN NOT NULL DEFAULT false,
  "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AlertAcknowledgement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AlertAcknowledgement_alertId_userId_key" ON "AlertAcknowledgement"("alertId", "userId");
CREATE INDEX "AlertAcknowledgement_dismissedAt_idx" ON "AlertAcknowledgement"("dismissedAt");
CREATE INDEX "AlertAcknowledgement_userId_idx" ON "AlertAcknowledgement"("userId");
