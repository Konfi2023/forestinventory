-- CreateEnum
CREATE TYPE "OperationType" AS ENUM ('HARVEST', 'PLANTING', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "HarvestType" AS ENUM ('REGULAR', 'CALAMITY', 'SAFETY');

-- CreateEnum
CREATE TYPE "WoodType" AS ENUM ('LOG', 'INDUSTRIAL', 'ENERGY');

-- CreateEnum
CREATE TYPE "PolterStatus" AS ENUM ('PILED', 'SOLD', 'COLLECTED');

-- CreateEnum
CREATE TYPE "AnimalRecordType" AS ENUM ('SIGHTING', 'HUNTING', 'INVENTORY');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "defaultLanguage" TEXT NOT NULL DEFAULT 'de',
    "stripeCustomerId" TEXT,
    "subscriptionStatus" TEXT DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "keycloakId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "companyName" TEXT,
    "vatId" TEXT,
    "street" TEXT,
    "zip" TEXT,
    "city" TEXT,
    "country" TEXT DEFAULT 'Deutschland',
    "preferredLanguage" TEXT NOT NULL DEFAULT 'de',
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "lastActiveOrgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[],
    "isSystemRole" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "inviterId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityId" TEXT,
    "entityType" TEXT,
    "metadata" JSONB,
    "actorId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Forest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "geoJson" JSONB,
    "areaHa" DOUBLE PRECISION,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Forest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForestHabitat" (
    "id" TEXT NOT NULL,
    "geoJson" JSONB NOT NULL,
    "areaHa" DOUBLE PRECISION,
    "type" TEXT,
    "protectionStatus" TEXT,
    "description" TEXT,
    "note" TEXT,
    "forestId" TEXT NOT NULL,

    CONSTRAINT "ForestHabitat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForestHunting" (
    "id" TEXT NOT NULL,
    "geoJson" JSONB NOT NULL,
    "areaHa" DOUBLE PRECISION,
    "name" TEXT,
    "pachter" TEXT,
    "endsAt" TEXT,
    "note" TEXT,
    "forestId" TEXT NOT NULL,

    CONSTRAINT "ForestHunting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForestCalamity" (
    "id" TEXT NOT NULL,
    "geoJson" JSONB NOT NULL,
    "areaHa" DOUBLE PRECISION,
    "cause" TEXT,
    "status" TEXT,
    "amount" DOUBLE PRECISION,
    "description" TEXT,
    "note" TEXT,
    "forestId" TEXT NOT NULL,

    CONSTRAINT "ForestCalamity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForestMaintenance" (
    "id" TEXT NOT NULL,
    "geoJson" JSONB NOT NULL,
    "areaHa" DOUBLE PRECISION,
    "description" TEXT,
    "activities" JSONB,
    "note" TEXT,
    "forestId" TEXT NOT NULL,

    CONSTRAINT "ForestMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForestPlanting" (
    "id" TEXT NOT NULL,
    "treeSpecies" TEXT NOT NULL,
    "description" TEXT,
    "note" TEXT,
    "content" JSONB,
    "geoJson" JSONB NOT NULL,
    "areaHa" DOUBLE PRECISION,
    "forestId" TEXT NOT NULL,

    CONSTRAINT "ForestPlanting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForestPath" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT,
    "geoJson" JSONB NOT NULL,
    "lengthM" DOUBLE PRECISION,
    "note" TEXT,
    "forestId" TEXT NOT NULL,

    CONSTRAINT "ForestPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForestPoi" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "forestId" TEXT NOT NULL,

    CONSTRAINT "ForestPoi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT,
    "type" "OperationType" NOT NULL DEFAULT 'HARVEST',
    "forestId" TEXT NOT NULL,
    "maintenanceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Operation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "operationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Harvest" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "harvestType" "HarvestType" NOT NULL,
    "woodType" "WoodType" NOT NULL,
    "treeSpecies" TEXT NOT NULL,
    "quality" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "revenue" DECIMAL(10,2),
    "isSold" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "operationId" TEXT NOT NULL,

    CONSTRAINT "Harvest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogPile" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "status" "PolterStatus" NOT NULL DEFAULT 'PILED',
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "estimatedAmount" DOUBLE PRECISION,
    "logLength" DOUBLE PRECISION,
    "amount" DOUBLE PRECISION,
    "unit" TEXT,
    "woodType" "WoodType",
    "treeSpecies" TEXT,
    "imageUrl" TEXT,
    "note" TEXT,
    "operationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogPile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Planting" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "treeSpecies" TEXT NOT NULL,
    "scientificName" TEXT,
    "provenance" TEXT,
    "sortiment" TEXT,
    "plantType" TEXT,
    "count" INTEGER NOT NULL,
    "geoJson" JSONB,
    "areaHa" DOUBLE PRECISION,
    "note" TEXT,
    "operationId" TEXT NOT NULL,

    CONSTRAINT "Planting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,

    CONSTRAINT "Cost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "forestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "forestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkidTrail" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "geoJson" JSONB NOT NULL,
    "lengthM" DOUBLE PRECISION,
    "forestId" TEXT NOT NULL,

    CONSTRAINT "SkidTrail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreeRecord" (
    "id" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "count" INTEGER,
    "volume" DOUBLE PRECISION,
    "health" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "forestId" TEXT NOT NULL,

    CONSTRAINT "TreeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimalRecord" (
    "id" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "type" "AnimalRecordType" NOT NULL DEFAULT 'SIGHTING',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "forestId" TEXT NOT NULL,

    CONSTRAINT "AnimalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_keycloakId_key" ON "User"("keycloakId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE INDEX "Membership_organizationId_idx" ON "Membership"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_organizationId_key" ON "Role"("name", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Operation_maintenanceId_key" ON "Operation"("maintenanceId");

-- CreateIndex
CREATE UNIQUE INDEX "OperationToken_token_key" ON "OperationToken"("token");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Forest" ADD CONSTRAINT "Forest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForestHabitat" ADD CONSTRAINT "ForestHabitat_forestId_fkey" FOREIGN KEY ("forestId") REFERENCES "Forest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForestHunting" ADD CONSTRAINT "ForestHunting_forestId_fkey" FOREIGN KEY ("forestId") REFERENCES "Forest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForestCalamity" ADD CONSTRAINT "ForestCalamity_forestId_fkey" FOREIGN KEY ("forestId") REFERENCES "Forest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForestMaintenance" ADD CONSTRAINT "ForestMaintenance_forestId_fkey" FOREIGN KEY ("forestId") REFERENCES "Forest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForestPlanting" ADD CONSTRAINT "ForestPlanting_forestId_fkey" FOREIGN KEY ("forestId") REFERENCES "Forest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForestPath" ADD CONSTRAINT "ForestPath_forestId_fkey" FOREIGN KEY ("forestId") REFERENCES "Forest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForestPoi" ADD CONSTRAINT "ForestPoi_forestId_fkey" FOREIGN KEY ("forestId") REFERENCES "Forest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_forestId_fkey" FOREIGN KEY ("forestId") REFERENCES "Forest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "ForestMaintenance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationToken" ADD CONSTRAINT "OperationToken_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Harvest" ADD CONSTRAINT "Harvest_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogPile" ADD CONSTRAINT "LogPile_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Planting" ADD CONSTRAINT "Planting_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cost" ADD CONSTRAINT "Cost_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_forestId_fkey" FOREIGN KEY ("forestId") REFERENCES "Forest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_forestId_fkey" FOREIGN KEY ("forestId") REFERENCES "Forest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkidTrail" ADD CONSTRAINT "SkidTrail_forestId_fkey" FOREIGN KEY ("forestId") REFERENCES "Forest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreeRecord" ADD CONSTRAINT "TreeRecord_forestId_fkey" FOREIGN KEY ("forestId") REFERENCES "Forest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimalRecord" ADD CONSTRAINT "AnimalRecord_forestId_fkey" FOREIGN KEY ("forestId") REFERENCES "Forest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
