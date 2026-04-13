CREATE TABLE "app"."ForestCorrelationAlert" (
    "id" TEXT NOT NULL,
    "forestId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "suggestion" TEXT NOT NULL,
    "sources" JSONB NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForestCorrelationAlert_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ForestCorrelationAlert_forestId_ruleId_triggeredAt_key" ON "app"."ForestCorrelationAlert"("forestId", "ruleId", "triggeredAt");
CREATE INDEX "ForestCorrelationAlert_forestId_triggeredAt_idx" ON "app"."ForestCorrelationAlert"("forestId", "triggeredAt");
CREATE INDEX "ForestCorrelationAlert_expiresAt_idx" ON "app"."ForestCorrelationAlert"("expiresAt");

ALTER TABLE "app"."ForestCorrelationAlert" ADD CONSTRAINT "ForestCorrelationAlert_forestId_fkey" FOREIGN KEY ("forestId") REFERENCES "app"."Forest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
