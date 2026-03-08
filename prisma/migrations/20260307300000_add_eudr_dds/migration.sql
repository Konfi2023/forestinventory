-- CreateTable: DueDiligenceStatement
CREATE TABLE "DueDiligenceStatement" (
    "id"              TEXT NOT NULL,
    "orgId"           TEXT NOT NULL,
    "status"          TEXT NOT NULL DEFAULT 'DRAFT',
    "activityType"    TEXT NOT NULL,
    "internalNote"    TEXT,
    "referenceNumber" TEXT,
    "submittedAt"     TIMESTAMP(3),
    "snapshotGeoJson" JSONB,
    "snapshotRisk"    JSONB,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DueDiligenceStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EudrProduct
CREATE TABLE "EudrProduct" (
    "id"               TEXT NOT NULL,
    "statementId"      TEXT NOT NULL,
    "hsCode"           TEXT NOT NULL,
    "description"      TEXT,
    "scientificName"   TEXT,
    "treeSpecies"      TEXT,
    "quantityM3"       DOUBLE PRECISION,
    "quantityKg"       DOUBLE PRECISION,
    "countryOfHarvest" TEXT NOT NULL DEFAULT 'DE',
    "forestId"         TEXT,
    "polygonIds"       TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "EudrProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EudrDocument
CREATE TABLE "EudrDocument" (
    "id"          TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "docType"     TEXT NOT NULL,
    "filename"    TEXT NOT NULL,
    "s3Key"       TEXT NOT NULL,
    "uploadedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EudrDocument_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DueDiligenceStatement" ADD CONSTRAINT "DueDiligenceStatement_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EudrProduct" ADD CONSTRAINT "EudrProduct_statementId_fkey"
    FOREIGN KEY ("statementId") REFERENCES "DueDiligenceStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EudrDocument" ADD CONSTRAINT "EudrDocument_statementId_fkey"
    FOREIGN KEY ("statementId") REFERENCES "DueDiligenceStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "DueDiligenceStatement_orgId_status_idx" ON "DueDiligenceStatement"("orgId", "status");
