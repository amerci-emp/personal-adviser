/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `color` on the `BankAccount` table. All the data in the column will be lost.
  - You are about to drop the column `institutionLogo` on the `BankAccount` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `BankAccount` table. All the data in the column will be lost.
  - You are about to drop the column `accountId` on the `PlaidAccount` table. All the data in the column will be lost.
  - You are about to drop the column `mask` on the `PlaidAccount` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `PlaidAccount` table. All the data in the column will be lost.
  - You are about to drop the column `officialName` on the `PlaidAccount` table. All the data in the column will be lost.
  - You are about to drop the column `plaidItemId` on the `PlaidAccount` table. All the data in the column will be lost.
  - You are about to drop the column `subtype` on the `PlaidAccount` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `PlaidAccount` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `errorMessage` on the `Statement` table. All the data in the column will be lost.
  - You are about to drop the column `exportAttempts` on the `Statement` table. All the data in the column will be lost.
  - You are about to drop the column `exportError` on the `Statement` table. All the data in the column will be lost.
  - You are about to drop the column `exportedAt` on the `Statement` table. All the data in the column will be lost.
  - You are about to drop the column `lastRetryAt` on the `Statement` table. All the data in the column will be lost.
  - You are about to drop the column `processedTimestamp` on the `Statement` table. All the data in the column will be lost.
  - You are about to drop the column `storageBucket` on the `Statement` table. All the data in the column will be lost.
  - You are about to drop the column `storageFilePath` on the `Statement` table. All the data in the column will be lost.
  - You are about to drop the column `storageUrl` on the `Statement` table. All the data in the column will be lost.
  - The `status` column on the `Statement` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `assignedCategory` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `categoryId` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `cleanedMerchant` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `communityScore` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `exported` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `exportedAt` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `lastReviewedAt` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `monthlySheetId` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `needsReview` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `originalText` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `personalScore` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `plaidTransactionId` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `reviewConfidence` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `reviewCount` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `reviewed` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `transactionDate` on the `Transaction` table. All the data in the column will be lost.
  - The `connectionType` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `accuracyBonusPoints` on the `UserPoints` table. All the data in the column will be lost.
  - You are about to drop the column `communityContributionPoints` on the `UserPoints` table. All the data in the column will be lost.
  - You are about to drop the column `currentMonthCompletionRate` on the `UserPoints` table. All the data in the column will be lost.
  - You are about to drop the column `level` on the `UserPoints` table. All the data in the column will be lost.
  - You are about to drop the column `monthlyReviewPoints` on the `UserPoints` table. All the data in the column will be lost.
  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CategoryPreferences` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CommunityMerchantIntelligence` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExportJob` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GoogleSheetConfig` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MonthlySheet` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PersonalFinanceSpreadsheet` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PlaidItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PointActivity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReviewSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserAccuracyMetrics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserAchievement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserMerchantConflict` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserMerchantPattern` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_BankAccountToStatement` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[plaidId]` on the table `PlaidAccount` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `accountType` on the `BankAccount` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `plaidId` to the `PlaidAccount` table without a default value. This is not possible if the table is not empty.
  - Made the column `bankAccountId` on table `PlaidAccount` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `s3Key` to the `Statement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bankAccountId` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `date` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."BankAccount" DROP CONSTRAINT "BankAccount_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Category" DROP CONSTRAINT "Category_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CategoryPreferences" DROP CONSTRAINT "CategoryPreferences_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ExportJob" DROP CONSTRAINT "ExportJob_statementId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MonthlySheet" DROP CONSTRAINT "MonthlySheet_personalFinanceSheetId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PersonalFinanceSpreadsheet" DROP CONSTRAINT "PersonalFinanceSpreadsheet_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PlaidAccount" DROP CONSTRAINT "PlaidAccount_bankAccountId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PlaidAccount" DROP CONSTRAINT "PlaidAccount_plaidItemId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PlaidItem" DROP CONSTRAINT "PlaidItem_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PointActivity" DROP CONSTRAINT "PointActivity_statementId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PointActivity" DROP CONSTRAINT "PointActivity_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ReviewSession" DROP CONSTRAINT "ReviewSession_statementId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ReviewSession" DROP CONSTRAINT "ReviewSession_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Statement" DROP CONSTRAINT "Statement_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Transaction" DROP CONSTRAINT "Transaction_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Transaction" DROP CONSTRAINT "Transaction_monthlySheetId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Transaction" DROP CONSTRAINT "Transaction_statementId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserAccuracyMetrics" DROP CONSTRAINT "UserAccuracyMetrics_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserAchievement" DROP CONSTRAINT "UserAchievement_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserMerchantConflict" DROP CONSTRAINT "UserMerchantConflict_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserMerchantPattern" DROP CONSTRAINT "UserMerchantPattern_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."_BankAccountToStatement" DROP CONSTRAINT "_BankAccountToStatement_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_BankAccountToStatement" DROP CONSTRAINT "_BankAccountToStatement_B_fkey";

-- DropIndex
DROP INDEX "public"."Account_userId_idx";

-- DropIndex
DROP INDEX "public"."BankAccount_financialInstitution_idx";

-- DropIndex
DROP INDEX "public"."BankAccount_userId_financialInstitution_lastFourDigits_key";

-- DropIndex
DROP INDEX "public"."BankAccount_userId_idx";

-- DropIndex
DROP INDEX "public"."PlaidAccount_plaidItemId_accountId_key";

-- DropIndex
DROP INDEX "public"."PlaidAccount_plaidItemId_idx";

-- DropIndex
DROP INDEX "public"."Session_userId_idx";

-- DropIndex
DROP INDEX "public"."Statement_exportAttempts_idx";

-- DropIndex
DROP INDEX "public"."Statement_status_idx";

-- DropIndex
DROP INDEX "public"."Statement_userId_idx";

-- DropIndex
DROP INDEX "public"."Transaction_categoryId_idx";

-- DropIndex
DROP INDEX "public"."Transaction_exported_idx";

-- DropIndex
DROP INDEX "public"."Transaction_monthlySheetId_idx";

-- DropIndex
DROP INDEX "public"."Transaction_plaidTransactionId_key";

-- DropIndex
DROP INDEX "public"."Transaction_reviewConfidence_idx";

-- DropIndex
DROP INDEX "public"."Transaction_reviewed_idx";

-- DropIndex
DROP INDEX "public"."Transaction_statementId_idx";

-- DropIndex
DROP INDEX "public"."Transaction_transactionDate_idx";

-- DropIndex
DROP INDEX "public"."UserPoints_totalPoints_idx";

-- DropIndex
DROP INDEX "public"."UserPoints_userId_idx";

-- AlterTable
ALTER TABLE "public"."Account" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "public"."BankAccount" DROP COLUMN "color",
DROP COLUMN "institutionLogo",
DROP COLUMN "notes",
DROP COLUMN "accountType",
ADD COLUMN     "accountType" TEXT NOT NULL,
ALTER COLUMN "balance" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."PlaidAccount" DROP COLUMN "accountId",
DROP COLUMN "mask",
DROP COLUMN "name",
DROP COLUMN "officialName",
DROP COLUMN "plaidItemId",
DROP COLUMN "subtype",
DROP COLUMN "type",
ADD COLUMN     "plaidId" TEXT NOT NULL,
ALTER COLUMN "bankAccountId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."Session" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "public"."Statement" DROP COLUMN "errorMessage",
DROP COLUMN "exportAttempts",
DROP COLUMN "exportError",
DROP COLUMN "exportedAt",
DROP COLUMN "lastRetryAt",
DROP COLUMN "processedTimestamp",
DROP COLUMN "storageBucket",
DROP COLUMN "storageFilePath",
DROP COLUMN "storageUrl",
ADD COLUMN     "bankAccountId" TEXT,
ADD COLUMN     "s3Key" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'UPLOADED',
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."Transaction" DROP COLUMN "assignedCategory",
DROP COLUMN "categoryId",
DROP COLUMN "cleanedMerchant",
DROP COLUMN "communityScore",
DROP COLUMN "exported",
DROP COLUMN "exportedAt",
DROP COLUMN "lastReviewedAt",
DROP COLUMN "monthlySheetId",
DROP COLUMN "needsReview",
DROP COLUMN "originalText",
DROP COLUMN "personalScore",
DROP COLUMN "plaidTransactionId",
DROP COLUMN "reviewConfidence",
DROP COLUMN "reviewCount",
DROP COLUMN "reviewed",
DROP COLUMN "source",
DROP COLUMN "transactionDate",
ADD COLUMN     "bankAccountId" TEXT NOT NULL,
ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "statementId" DROP NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "aiProfile" JSONB,
ADD COLUMN     "isAiEnabled" BOOLEAN DEFAULT false,
DROP COLUMN "connectionType",
ADD COLUMN     "connectionType" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."UserPoints" DROP COLUMN "accuracyBonusPoints",
DROP COLUMN "communityContributionPoints",
DROP COLUMN "currentMonthCompletionRate",
DROP COLUMN "level",
DROP COLUMN "monthlyReviewPoints",
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropTable
DROP TABLE "public"."Category";

-- DropTable
DROP TABLE "public"."CategoryPreferences";

-- DropTable
DROP TABLE "public"."CommunityMerchantIntelligence";

-- DropTable
DROP TABLE "public"."ExportJob";

-- DropTable
DROP TABLE "public"."GoogleSheetConfig";

-- DropTable
DROP TABLE "public"."MonthlySheet";

-- DropTable
DROP TABLE "public"."PersonalFinanceSpreadsheet";

-- DropTable
DROP TABLE "public"."PlaidItem";

-- DropTable
DROP TABLE "public"."PointActivity";

-- DropTable
DROP TABLE "public"."ReviewSession";

-- DropTable
DROP TABLE "public"."UserAccuracyMetrics";

-- DropTable
DROP TABLE "public"."UserAchievement";

-- DropTable
DROP TABLE "public"."UserMerchantConflict";

-- DropTable
DROP TABLE "public"."UserMerchantPattern";

-- DropTable
DROP TABLE "public"."_BankAccountToStatement";

-- DropEnum
DROP TYPE "public"."AccountType";

-- DropEnum
DROP TYPE "public"."ConnectionType";

-- DropEnum
DROP TYPE "public"."ExportJobStatus";

-- DropEnum
DROP TYPE "public"."MigrationPolicy";

-- DropEnum
DROP TYPE "public"."PlaidSyncStatus";

-- DropEnum
DROP TYPE "public"."PointActivityType";

-- DropEnum
DROP TYPE "public"."ReviewSessionStatus";

-- DropEnum
DROP TYPE "public"."StatementStatus";

-- DropEnum
DROP TYPE "public"."TransactionSource";

-- DropEnum
DROP TYPE "public"."UserType";

-- CreateTable
CREATE TABLE "public"."_AssociatedStatements" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AssociatedStatements_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AssociatedStatements_B_index" ON "public"."_AssociatedStatements"("B");

-- CreateIndex
CREATE UNIQUE INDEX "PlaidAccount_plaidId_key" ON "public"."PlaidAccount"("plaidId");

-- AddForeignKey
ALTER TABLE "public"."BankAccount" ADD CONSTRAINT "BankAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Statement" ADD CONSTRAINT "Statement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Statement" ADD CONSTRAINT "Statement_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "public"."BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "public"."BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "public"."Statement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlaidAccount" ADD CONSTRAINT "PlaidAccount_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "public"."BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AssociatedStatements" ADD CONSTRAINT "_AssociatedStatements_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AssociatedStatements" ADD CONSTRAINT "_AssociatedStatements_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Statement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
