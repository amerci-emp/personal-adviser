/*
  Warnings:

  - You are about to drop the column `isActive` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `isSystemCategory` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `parentId` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `sortOrder` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `currencyFormat` on the `GoogleSheetConfig` table. All the data in the column will be lost.
  - You are about to drop the column `dateFormat` on the `GoogleSheetConfig` table. All the data in the column will be lost.
  - You are about to drop the column `errorCount` on the `GoogleSheetConfig` table. All the data in the column will be lost.
  - You are about to drop the column `includeCategories` on the `GoogleSheetConfig` table. All the data in the column will be lost.
  - You are about to drop the column `includeSubcategories` on the `GoogleSheetConfig` table. All the data in the column will be lost.
  - You are about to drop the column `lastErrorMessage` on the `GoogleSheetConfig` table. All the data in the column will be lost.
  - You are about to drop the column `lastErrorTimestamp` on the `GoogleSheetConfig` table. All the data in the column will be lost.
  - You are about to drop the column `lastSuccessfulSync` on the `GoogleSheetConfig` table. All the data in the column will be lost.
  - You are about to drop the column `lastSyncAttempt` on the `GoogleSheetConfig` table. All the data in the column will be lost.
  - You are about to drop the column `monthlySheetCount` on the `GoogleSheetConfig` table. All the data in the column will be lost.
  - You are about to drop the column `syncFrequency` on the `GoogleSheetConfig` table. All the data in the column will be lost.
  - You are about to drop the column `syncStatus` on the `GoogleSheetConfig` table. All the data in the column will be lost.
  - You are about to drop the column `totalTransactionsSynced` on the `GoogleSheetConfig` table. All the data in the column will be lost.
  - You are about to drop the column `googleSheetConfigId` on the `MonthlySheet` table. All the data in the column will be lost.
  - You are about to drop the column `hasCustomFormulas` on the `MonthlySheet` table. All the data in the column will be lost.
  - You are about to drop the column `isArchived` on the `MonthlySheet` table. All the data in the column will be lost.
  - You are about to drop the column `monthYear` on the `MonthlySheet` table. All the data in the column will be lost.
  - You are about to drop the column `spreadsheetId` on the `MonthlySheet` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `MonthlySheet` table. All the data in the column will be lost.
  - You are about to drop the column `expenseType` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `isBusinessExpense` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `isRecurring` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `merchantName` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `subcategoryName` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `Transaction` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,name]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[personalFinanceSheetId,monthKey]` on the table `MonthlySheet` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `month` to the `MonthlySheet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `monthKey` to the `MonthlySheet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `personalFinanceSheetId` to the `MonthlySheet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `MonthlySheet` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `sheetId` on the `MonthlySheet` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

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
ALTER TABLE "Category" DROP CONSTRAINT "Category_parentId_fkey";

-- DropForeignKey
ALTER TABLE "MonthlySheet" DROP CONSTRAINT "MonthlySheet_userId_fkey";

-- DropIndex
DROP INDEX "Category_parentId_idx";

-- DropIndex
DROP INDEX "Category_type_idx";

-- DropIndex
DROP INDEX "Category_userId_name_parentId_key";

-- DropIndex
DROP INDEX "GoogleSheetConfig_syncStatus_idx";

-- DropIndex
DROP INDEX "MonthlySheet_monthYear_idx";

-- DropIndex
DROP INDEX "MonthlySheet_spreadsheetId_idx";

-- DropIndex
DROP INDEX "MonthlySheet_userId_idx";

-- DropIndex
DROP INDEX "MonthlySheet_userId_monthYear_key";

-- DropIndex
DROP INDEX "Transaction_expenseType_idx";

-- DropIndex
DROP INDEX "Transaction_merchantName_idx";

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "isActive",
DROP COLUMN "isSystemCategory",
DROP COLUMN "parentId",
DROP COLUMN "sortOrder",
DROP COLUMN "type";

-- AlterTable
ALTER TABLE "GoogleSheetConfig" DROP COLUMN "currencyFormat",
DROP COLUMN "dateFormat",
DROP COLUMN "errorCount",
DROP COLUMN "includeCategories",
DROP COLUMN "includeSubcategories",
DROP COLUMN "lastErrorMessage",
DROP COLUMN "lastErrorTimestamp",
DROP COLUMN "lastSuccessfulSync",
DROP COLUMN "lastSyncAttempt",
DROP COLUMN "monthlySheetCount",
DROP COLUMN "syncFrequency",
DROP COLUMN "syncStatus",
DROP COLUMN "totalTransactionsSynced";

-- AlterTable
ALTER TABLE "MonthlySheet" DROP COLUMN "googleSheetConfigId",
DROP COLUMN "hasCustomFormulas",
DROP COLUMN "isArchived",
DROP COLUMN "monthYear",
DROP COLUMN "spreadsheetId",
DROP COLUMN "userId",
ADD COLUMN     "month" INTEGER NOT NULL,
ADD COLUMN     "monthKey" TEXT NOT NULL,
ADD COLUMN     "personalFinanceSheetId" TEXT NOT NULL,
ADD COLUMN     "year" INTEGER NOT NULL,
DROP COLUMN "sheetId",
ADD COLUMN     "sheetId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Statement" ADD COLUMN     "exportAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "exportError" TEXT,
ADD COLUMN     "exportedAt" TIMESTAMP(3),
ADD COLUMN     "lastRetryAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "expenseType",
DROP COLUMN "isBusinessExpense",
DROP COLUMN "isRecurring",
DROP COLUMN "location",
DROP COLUMN "merchantName",
DROP COLUMN "notes",
DROP COLUMN "subcategoryName",
DROP COLUMN "tags",
ADD COLUMN     "assignedCategory" TEXT,
ADD COLUMN     "cleanedMerchant" TEXT,
ADD COLUMN     "exported" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "exportedAt" TIMESTAMP(3),
ADD COLUMN     "monthlySheetId" TEXT;

-- DropEnum
DROP TYPE "CategoryType";

-- DropEnum
DROP TYPE "ExpenseType";

-- DropEnum
DROP TYPE "SyncStatus";

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
CREATE UNIQUE INDEX "Category_userId_name_key" ON "Category"("userId", "name");

-- CreateIndex
CREATE INDEX "MonthlySheet_monthKey_idx" ON "MonthlySheet"("monthKey");

-- CreateIndex
CREATE INDEX "MonthlySheet_year_month_idx" ON "MonthlySheet"("year", "month");

-- CreateIndex
CREATE INDEX "MonthlySheet_personalFinanceSheetId_idx" ON "MonthlySheet"("personalFinanceSheetId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlySheet_personalFinanceSheetId_monthKey_key" ON "MonthlySheet"("personalFinanceSheetId", "monthKey");

-- CreateIndex
CREATE INDEX "Statement_exportAttempts_idx" ON "Statement"("exportAttempts");

-- CreateIndex
CREATE INDEX "Transaction_exported_idx" ON "Transaction"("exported");

-- CreateIndex
CREATE INDEX "Transaction_monthlySheetId_idx" ON "Transaction"("monthlySheetId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_monthlySheetId_fkey" FOREIGN KEY ("monthlySheetId") REFERENCES "MonthlySheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalFinanceSpreadsheet" ADD CONSTRAINT "PersonalFinanceSpreadsheet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlySheet" ADD CONSTRAINT "MonthlySheet_personalFinanceSheetId_fkey" FOREIGN KEY ("personalFinanceSheetId") REFERENCES "PersonalFinanceSpreadsheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
