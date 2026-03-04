-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('PRIVATE_OWNER', 'FORESTRY_COMPANY', 'SERVICE_PROVIDER', 'ASSOCIATION', 'PUBLIC');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "billingEmail" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT DEFAULT 'Deutschland',
ADD COLUMN     "legalName" TEXT,
ADD COLUMN     "orgType" "OrgType" NOT NULL DEFAULT 'PRIVATE_OWNER',
ADD COLUMN     "street" TEXT,
ADD COLUMN     "totalHectares" DOUBLE PRECISION,
ADD COLUMN     "vatId" TEXT,
ADD COLUMN     "zip" TEXT;
