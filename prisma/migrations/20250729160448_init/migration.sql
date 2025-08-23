-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CHECKING', 'SAVINGS', 'CREDIT', 'INVESTMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "StatementStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'REVIEW_NEEDED', 'COMPLETED', 'FAILED', 'EXPORT_QUEUED', 'EXPORTING', 'EXPORT_RETRYING');

-- CreateEnum
CREATE TYPE "ExportJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('STUDENT', 'YOUNG_PROFESSIONAL', 'HOMEOWNER', 'RENTER', 'RETIREE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MigrationPolicy" AS ENUM ('NEW_SHEETS_ONLY', 'MIGRATE_ALL', 'ASK_EACH_TIME');

-- CreateEnum
CREATE TYPE "PointActivityType" AS ENUM ('MONTHLY_REVIEW', 'AI_TRAINING', 'ACCURACY_BONUS', 'COMMUNITY_CONTRIBUTION');

-- CreateEnum
CREATE TYPE "ReviewSessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "ConnectionType" AS ENUM ('PLAID', 'MANUAL');

-- CreateEnum
CREATE TYPE "PlaidSyncStatus" AS ENUM ('ACTIVE', 'ITEM_LOGIN_REQUIRED', 'PENDING_EXPIRATION', 'ITEM_ERROR');

-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('MANUAL', 'PLAID');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "connectionType" "ConnectionType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "financialInstitution" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL DEFAULT 'OTHER',
    "lastFourDigits" TEXT,
    "balance" DECIMAL(12,2),
    "notes" TEXT,
    "color" TEXT,
    "institutionLogo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Statement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "uploadTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "StatementStatus" NOT NULL DEFAULT 'UPLOADED',
    "processedTimestamp" TIMESTAMP(3),
    "errorMessage" TEXT,
    "storageUrl" TEXT,
    "storageBucket" TEXT,
    "storageFilePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodEnd" TIMESTAMP(3),
    "periodStart" TIMESTAMP(3),
    "exportAttempts" INTEGER NOT NULL DEFAULT 0,
    "exportError" TEXT,
    "exportedAt" TIMESTAMP(3),
    "lastRetryAt" TIMESTAMP(3),

    CONSTRAINT "Statement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "categoryId" TEXT,
    "originalText" TEXT,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedCategory" TEXT,
    "cleanedMerchant" TEXT,
    "communityScore" DECIMAL(5,2),
    "exported" BOOLEAN NOT NULL DEFAULT false,
    "exportedAt" TIMESTAMP(3),
    "lastReviewedAt" TIMESTAMP(3),
    "monthlySheetId" TEXT,
    "personalScore" DECIMAL(5,2),
    "reviewConfidence" DECIMAL(5,2),
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "source" "TransactionSource" NOT NULL DEFAULT 'MANUAL',
    "plaidTransactionId" TEXT,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleSheetConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT,
    "accessToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "spreadsheetId" TEXT,
    "spreadsheetName" TEXT,
    "autoExport" BOOLEAN NOT NULL DEFAULT false,
    "retentionPolicy" TEXT,
    "lastExported" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoogleSheetConfig_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "MonthlySheet" (
    "id" TEXT NOT NULL,
    "personalFinanceSheetId" TEXT NOT NULL,
    "sheetId" INTEGER NOT NULL,
    "sheetName" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlySheet_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "CategoryPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userType" "UserType",
    "version" INTEGER NOT NULL DEFAULT 1,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "migrationPolicy" "MigrationPolicy" NOT NULL DEFAULT 'NEW_SHEETS_ONLY',
    "lastMigrationAt" TIMESTAMP(3),
    "backupCreated" BOOLEAN NOT NULL DEFAULT false,
    "categoryConfig" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityMerchantIntelligence" (
    "id" TEXT NOT NULL,
    "merchantPatternHash" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "locationRegionHash" TEXT,
    "confidenceScore" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "contributorAccuracyWeight" DECIMAL(3,2) NOT NULL DEFAULT 0.50,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityMerchantIntelligence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityType" "PointActivityType" NOT NULL,
    "pointsEarned" INTEGER NOT NULL,
    "completionRate" DECIMAL(3,2),
    "description" TEXT,
    "statementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewSession" (
    "id" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalTransactions" INTEGER NOT NULL,
    "reviewedCount" INTEGER NOT NULL DEFAULT 0,
    "currentTransactionIndex" INTEGER NOT NULL DEFAULT 0,
    "sessionData" JSONB,
    "status" "ReviewSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + '1 year'::interval),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAccuracyMetrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "overallAccuracy" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "consistencyScore" DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    "communityInfluenceWeight" DECIMAL(3,2) NOT NULL DEFAULT 0.50,
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAccuracyMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementKey" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMerchantConflict" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "merchantHash" TEXT NOT NULL,
    "hourContext" TEXT,
    "dayContext" TEXT,
    "previousCategory" TEXT NOT NULL,
    "newCategory" TEXT NOT NULL,
    "userChoice" TEXT NOT NULL,
    "transactionAmount" DECIMAL(10,2),
    "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMerchantConflict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMerchantPattern" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "merchantHash" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "hourContext" TEXT,
    "dayContext" TEXT,
    "confidenceScore" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "lastReviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consistencyScore" DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMerchantPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPoints" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "monthlyReviewPoints" INTEGER NOT NULL DEFAULT 0,
    "accuracyBonusPoints" INTEGER NOT NULL DEFAULT 0,
    "communityContributionPoints" INTEGER NOT NULL DEFAULT 0,
    "currentMonthCompletionRate" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaidItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "cursor" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSync" TIMESTAMP(3),
    "syncStatus" "PlaidSyncStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaidItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaidAccount" (
    "id" TEXT NOT NULL,
    "plaidItemId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "bankAccountId" TEXT,
    "name" TEXT NOT NULL,
    "officialName" TEXT,
    "mask" TEXT,
    "type" TEXT NOT NULL,
    "subtype" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaidAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BankAccountToStatement" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BankAccountToStatement_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "BankAccount_userId_idx" ON "BankAccount"("userId");

-- CreateIndex
CREATE INDEX "BankAccount_financialInstitution_idx" ON "BankAccount"("financialInstitution");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_userId_financialInstitution_lastFourDigits_key" ON "BankAccount"("userId", "financialInstitution", "lastFourDigits");

-- CreateIndex
CREATE INDEX "Statement_userId_idx" ON "Statement"("userId");

-- CreateIndex
CREATE INDEX "Statement_status_idx" ON "Statement"("status");

-- CreateIndex
CREATE INDEX "Statement_exportAttempts_idx" ON "Statement"("exportAttempts");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_plaidTransactionId_key" ON "Transaction"("plaidTransactionId");

-- CreateIndex
CREATE INDEX "Transaction_statementId_idx" ON "Transaction"("statementId");

-- CreateIndex
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");

-- CreateIndex
CREATE INDEX "Transaction_transactionDate_idx" ON "Transaction"("transactionDate");

-- CreateIndex
CREATE INDEX "Transaction_exported_idx" ON "Transaction"("exported");

-- CreateIndex
CREATE INDEX "Transaction_monthlySheetId_idx" ON "Transaction"("monthlySheetId");

-- CreateIndex
CREATE INDEX "Transaction_reviewConfidence_idx" ON "Transaction"("reviewConfidence");

-- CreateIndex
CREATE INDEX "Transaction_reviewed_idx" ON "Transaction"("reviewed");

-- CreateIndex
CREATE INDEX "Category_userId_idx" ON "Category"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_name_key" ON "Category"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleSheetConfig_userId_key" ON "GoogleSheetConfig"("userId");

-- CreateIndex
CREATE INDEX "GoogleSheetConfig_userId_idx" ON "GoogleSheetConfig"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalFinanceSpreadsheet_userId_key" ON "PersonalFinanceSpreadsheet"("userId");

-- CreateIndex
CREATE INDEX "PersonalFinanceSpreadsheet_userId_idx" ON "PersonalFinanceSpreadsheet"("userId");

-- CreateIndex
CREATE INDEX "PersonalFinanceSpreadsheet_spreadsheetId_idx" ON "PersonalFinanceSpreadsheet"("spreadsheetId");

-- CreateIndex
CREATE INDEX "MonthlySheet_monthKey_idx" ON "MonthlySheet"("monthKey");

-- CreateIndex
CREATE INDEX "MonthlySheet_year_month_idx" ON "MonthlySheet"("year", "month");

-- CreateIndex
CREATE INDEX "MonthlySheet_personalFinanceSheetId_idx" ON "MonthlySheet"("personalFinanceSheetId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlySheet_personalFinanceSheetId_monthKey_key" ON "MonthlySheet"("personalFinanceSheetId", "monthKey");

-- CreateIndex
CREATE INDEX "ExportJob_status_idx" ON "ExportJob"("status");

-- CreateIndex
CREATE INDEX "ExportJob_nextRetryAt_idx" ON "ExportJob"("nextRetryAt");

-- CreateIndex
CREATE INDEX "ExportJob_statementId_idx" ON "ExportJob"("statementId");

-- CreateIndex
CREATE INDEX "ExportJob_userId_idx" ON "ExportJob"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryPreferences_userId_key" ON "CategoryPreferences"("userId");

-- CreateIndex
CREATE INDEX "CategoryPreferences_userId_idx" ON "CategoryPreferences"("userId");

-- CreateIndex
CREATE INDEX "CategoryPreferences_effectiveDate_idx" ON "CategoryPreferences"("effectiveDate");

-- CreateIndex
CREATE INDEX "CommunityMerchantIntelligence_category_idx" ON "CommunityMerchantIntelligence"("category");

-- CreateIndex
CREATE INDEX "CommunityMerchantIntelligence_confidenceScore_idx" ON "CommunityMerchantIntelligence"("confidenceScore");

-- CreateIndex
CREATE INDEX "CommunityMerchantIntelligence_merchantPatternHash_idx" ON "CommunityMerchantIntelligence"("merchantPatternHash");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityMerchantIntelligence_merchantPatternHash_category__key" ON "CommunityMerchantIntelligence"("merchantPatternHash", "category", "locationRegionHash");

-- CreateIndex
CREATE INDEX "PointActivity_activityType_idx" ON "PointActivity"("activityType");

-- CreateIndex
CREATE INDEX "PointActivity_createdAt_idx" ON "PointActivity"("createdAt");

-- CreateIndex
CREATE INDEX "PointActivity_userId_idx" ON "PointActivity"("userId");

-- CreateIndex
CREATE INDEX "ReviewSession_expiresAt_idx" ON "ReviewSession"("expiresAt");

-- CreateIndex
CREATE INDEX "ReviewSession_statementId_idx" ON "ReviewSession"("statementId");

-- CreateIndex
CREATE INDEX "ReviewSession_status_idx" ON "ReviewSession"("status");

-- CreateIndex
CREATE INDEX "ReviewSession_userId_idx" ON "ReviewSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccuracyMetrics_userId_key" ON "UserAccuracyMetrics"("userId");

-- CreateIndex
CREATE INDEX "UserAccuracyMetrics_communityInfluenceWeight_idx" ON "UserAccuracyMetrics"("communityInfluenceWeight");

-- CreateIndex
CREATE INDEX "UserAccuracyMetrics_overallAccuracy_idx" ON "UserAccuracyMetrics"("overallAccuracy");

-- CreateIndex
CREATE INDEX "UserAccuracyMetrics_userId_idx" ON "UserAccuracyMetrics"("userId");

-- CreateIndex
CREATE INDEX "UserAchievement_achievementKey_idx" ON "UserAchievement"("achievementKey");

-- CreateIndex
CREATE INDEX "UserAchievement_userId_idx" ON "UserAchievement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_achievementKey_key" ON "UserAchievement"("userId", "achievementKey");

-- CreateIndex
CREATE INDEX "UserMerchantConflict_merchantHash_idx" ON "UserMerchantConflict"("merchantHash");

-- CreateIndex
CREATE INDEX "UserMerchantConflict_resolvedAt_idx" ON "UserMerchantConflict"("resolvedAt");

-- CreateIndex
CREATE INDEX "UserMerchantConflict_userId_idx" ON "UserMerchantConflict"("userId");

-- CreateIndex
CREATE INDEX "UserMerchantPattern_confidenceScore_idx" ON "UserMerchantPattern"("confidenceScore");

-- CreateIndex
CREATE INDEX "UserMerchantPattern_dayContext_idx" ON "UserMerchantPattern"("dayContext");

-- CreateIndex
CREATE INDEX "UserMerchantPattern_hourContext_idx" ON "UserMerchantPattern"("hourContext");

-- CreateIndex
CREATE INDEX "UserMerchantPattern_merchantHash_idx" ON "UserMerchantPattern"("merchantHash");

-- CreateIndex
CREATE INDEX "UserMerchantPattern_userId_idx" ON "UserMerchantPattern"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserMerchantPattern_userId_merchantHash_hourContext_dayCont_key" ON "UserMerchantPattern"("userId", "merchantHash", "hourContext", "dayContext");

-- CreateIndex
CREATE UNIQUE INDEX "UserPoints_userId_key" ON "UserPoints"("userId");

-- CreateIndex
CREATE INDEX "UserPoints_totalPoints_idx" ON "UserPoints"("totalPoints");

-- CreateIndex
CREATE INDEX "UserPoints_userId_idx" ON "UserPoints"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaidItem_itemId_key" ON "PlaidItem"("itemId");

-- CreateIndex
CREATE INDEX "PlaidItem_userId_idx" ON "PlaidItem"("userId");

-- CreateIndex
CREATE INDEX "PlaidAccount_plaidItemId_idx" ON "PlaidAccount"("plaidItemId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaidAccount_plaidItemId_accountId_key" ON "PlaidAccount"("plaidItemId", "accountId");

-- CreateIndex
CREATE INDEX "_BankAccountToStatement_B_index" ON "_BankAccountToStatement"("B");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Statement" ADD CONSTRAINT "Statement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_monthlySheetId_fkey" FOREIGN KEY ("monthlySheetId") REFERENCES "MonthlySheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalFinanceSpreadsheet" ADD CONSTRAINT "PersonalFinanceSpreadsheet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlySheet" ADD CONSTRAINT "MonthlySheet_personalFinanceSheetId_fkey" FOREIGN KEY ("personalFinanceSheetId") REFERENCES "PersonalFinanceSpreadsheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryPreferences" ADD CONSTRAINT "CategoryPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointActivity" ADD CONSTRAINT "PointActivity_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointActivity" ADD CONSTRAINT "PointActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewSession" ADD CONSTRAINT "ReviewSession_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewSession" ADD CONSTRAINT "ReviewSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccuracyMetrics" ADD CONSTRAINT "UserAccuracyMetrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMerchantConflict" ADD CONSTRAINT "UserMerchantConflict_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMerchantPattern" ADD CONSTRAINT "UserMerchantPattern_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPoints" ADD CONSTRAINT "UserPoints_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaidItem" ADD CONSTRAINT "PlaidItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaidAccount" ADD CONSTRAINT "PlaidAccount_plaidItemId_fkey" FOREIGN KEY ("plaidItemId") REFERENCES "PlaidItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaidAccount" ADD CONSTRAINT "PlaidAccount_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BankAccountToStatement" ADD CONSTRAINT "_BankAccountToStatement_A_fkey" FOREIGN KEY ("A") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BankAccountToStatement" ADD CONSTRAINT "_BankAccountToStatement_B_fkey" FOREIGN KEY ("B") REFERENCES "Statement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
