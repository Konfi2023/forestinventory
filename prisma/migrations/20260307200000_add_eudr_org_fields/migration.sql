-- AlterTable: EUDR fields on Organization
ALTER TABLE "Organization" ADD COLUMN "eudrActivityType" TEXT DEFAULT 'DOMESTIC';
ALTER TABLE "Organization" ADD COLUMN "eoriNumber" TEXT;
