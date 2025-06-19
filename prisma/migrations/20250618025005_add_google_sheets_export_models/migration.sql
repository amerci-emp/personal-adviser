/*
  Warnings:

  - You are about to drop the column `sheetUrl` on the `MonthlySheet` table. All the data in the column will be lost.
  - You are about to drop the column `spreadsheetId` on the `MonthlySheet` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `MonthlySheet` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[personalFinanceSheetId,monthKey]` on the table `MonthlySheet` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `month` to the `MonthlySheet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `personalFinanceSheetId` to the `MonthlySheet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sheetId` to the `MonthlySheet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `MonthlySheet` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ExportJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StatementStatus" ADD VALUE 'EXPORT_QUEUED';
ALTER TYPE "StatementStatus" ADD VALUE 'EXPORTING';
ALTER TYPE "StatementStatus" ADD VALUE 'EXPORT_RETRYING';

-- DropForeignKey
ALTER TABLE "MonthlySheet" DROP CONSTRAINT "MonthlySheet_userId_fkey";

-- DropIndex
DROP INDEX "MonthlySheet_userId_idx";

-- DropIndex
DROP INDEX "MonthlySheet_userId_monthKey_key";

-- AlterTable
ALTER TABLE "MonthlySheet" DROP COLUMN "sheetUrl",
DROP COLUMN "spreadsheetId",
DROP COLUMN "userId",
ADD COLUMN     "month" INTEGER NOT NULL,
ADD COLUMN     "personalFinanceSheetId" TEXT NOT NULL,
ADD COLUMN     "sheetId" INTEGER NOT NULL,
ADD COLUMN     "year" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Statement" ADD COLUMN     "exportAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "exportError" TEXT,
ADD COLUMN     "exportedAt" TIMESTAMP(3),
ADD COLUMN     "lastRetryAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "assignedCategory" TEXT,
ADD COLUMN     "cleanedMerchant" TEXT;

-- CreateTable
CREATE TABLE "PersonalFinanceSpreadsheet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "spreadsheetId" TEXT NOT NULL,
    "spreadsheetName" TEXT NOT NULL DEFAULT 'Personal Finance',
    "spreadsheetUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalFinanceSpreadsheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportJob" (
    "id" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ExportJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "totalTransactions" INTEGER NOT NULL DEFAULT 0,
    "processedTransactions" INTEGER NOT NULL DEFAULT 0,
    "failedTransactions" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "errorDetails" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonalFinanceSpreadsheet_userId_key" ON "PersonalFinanceSpreadsheet"("userId");

-- CreateIndex
CREATE INDEX "PersonalFinanceSpreadsheet_userId_idx" ON "PersonalFinanceSpreadsheet"("userId");

-- CreateIndex
CREATE INDEX "PersonalFinanceSpreadsheet_spreadsheetId_idx" ON "PersonalFinanceSpreadsheet"("spreadsheetId");

-- CreateIndex
CREATE INDEX "ExportJob_status_idx" ON "ExportJob"("status");

-- CreateIndex
CREATE INDEX "ExportJob_nextRetryAt_idx" ON "ExportJob"("nextRetryAt");

-- CreateIndex
CREATE INDEX "ExportJob_statementId_idx" ON "ExportJob"("statementId");

-- CreateIndex
CREATE INDEX "ExportJob_userId_idx" ON "ExportJob"("userId");

-- CreateIndex
CREATE INDEX "MonthlySheet_year_month_idx" ON "MonthlySheet"("year", "month");

-- CreateIndex
CREATE INDEX "MonthlySheet_personalFinanceSheetId_idx" ON "MonthlySheet"("personalFinanceSheetId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlySheet_personalFinanceSheetId_monthKey_key" ON "MonthlySheet"("personalFinanceSheetId", "monthKey");

-- CreateIndex
CREATE INDEX "Statement_exportAttempts_idx" ON "Statement"("exportAttempts");

-- AddForeignKey
ALTER TABLE "PersonalFinanceSpreadsheet" ADD CONSTRAINT "PersonalFinanceSpreadsheet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlySheet" ADD CONSTRAINT "MonthlySheet_personalFinanceSheetId_fkey" FOREIGN KEY ("personalFinanceSheetId") REFERENCES "PersonalFinanceSpreadsheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
