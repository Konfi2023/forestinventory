-- CreateTable: System Health Check Protokoll
CREATE TABLE "SystemHealthCheck" (
  "id"            TEXT NOT NULL,
  "runAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "overall"       TEXT NOT NULL,
  "dbOk"          BOOLEAN NOT NULL DEFAULT false,
  "openMeteoOk"   BOOLEAN NOT NULL DEFAULT false,
  "sentinelOk"    BOOLEAN NOT NULL DEFAULT false,
  "s3Ok"          BOOLEAN NOT NULL DEFAULT false,
  "report"        JSONB NOT NULL,
  "testAlertS1Id" TEXT,
  "testAlertWxId" TEXT,

  CONSTRAINT "SystemHealthCheck_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SystemHealthCheck_runAt_idx" ON "SystemHealthCheck"("runAt");
