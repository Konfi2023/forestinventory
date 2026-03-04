/*
  Warnings:

  - You are about to drop the column `amount` on the `LogPile` table. All the data in the column will be lost.
  - The `status` column on the `Operation` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "OperationStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'REVIEW');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TimeCategory" AS ENUM ('MANUAL_WORK', 'MACHINE_WORK', 'PLANNING', 'TRAVEL', 'INSPECTION');

-- CreateEnum
CREATE TYPE "TimberSaleStatus" AS ENUM ('DRAFT', 'NEGOTIATION', 'CONTRACT_SIGNED', 'COMPLETED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "AnimalRecordType" ADD VALUE 'DAMAGE';

-- AlterEnum
ALTER TYPE "HarvestType" ADD VALUE 'THINNING';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OperationType" ADD VALUE 'PLANNING';
ALTER TYPE "OperationType" ADD VALUE 'MONITORING';

-- AlterEnum
ALTER TYPE "PolterStatus" ADD VALUE 'MEASURED';

-- AlterEnum
ALTER TYPE "WoodType" ADD VALUE 'PULP';

-- AlterTable
ALTER TABLE "LogPile" DROP COLUMN "amount",
ADD COLUMN     "measuredAmount" DOUBLE PRECISION,
ADD COLUMN     "qualityClass" TEXT,
ADD COLUMN     "timberSaleId" TEXT;

-- AlterTable
ALTER TABLE "Operation" DROP COLUMN "status",
ADD COLUMN     "status" "OperationStatus" NOT NULL DEFAULT 'PLANNED';

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "forestId" TEXT NOT NULL,
    "operationId" TEXT,
    "assigneeId" TEXT,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskComment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "category" "TimeCategory" NOT NULL DEFAULT 'MANUAL_WORK',
    "taskId" TEXT,
    "operationId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimberSale" (
    "id" TEXT NOT NULL,
    "contractNumber" TEXT,
    "buyerName" TEXT NOT NULL,
    "status" "TimberSaleStatus" NOT NULL DEFAULT 'DRAFT',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pricePerUnit" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "organizationId" TEXT NOT NULL,
    "operationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimberSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportTicket" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "plateNumber" TEXT,
    "driverName" TEXT,
    "pickupDate" TIMESTAMP(3) NOT NULL,
    "factoryAmount" DOUBLE PRECISION NOT NULL,
    "factoryUnit" TEXT NOT NULL,
    "timberSaleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportTicket_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_forestId_fkey" FOREIGN KEY ("forestId") REFERENCES "Forest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogPile" ADD CONSTRAINT "LogPile_timberSaleId_fkey" FOREIGN KEY ("timberSaleId") REFERENCES "TimberSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimberSale" ADD CONSTRAINT "TimberSale_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimberSale" ADD CONSTRAINT "TimberSale_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportTicket" ADD CONSTRAINT "TransportTicket_timberSaleId_fkey" FOREIGN KEY ("timberSaleId") REFERENCES "TimberSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
