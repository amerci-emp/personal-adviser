-- CreateEnum
CREATE TYPE "public"."UserType" AS ENUM ('COLLEGE_STUDENT', 'YOUNG_PROFESSIONAL', 'FAMILY', 'RETIREE', 'SMALL_BUSINESS_OWNER', 'FREELANCER', 'UNKNOWN');

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "mainGroup" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "isSystemDefault" BOOLEAN NOT NULL DEFAULT true,
    "icon" TEXT,
    "defaultColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserCategoryPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "customName" TEXT,
    "monthlyBudget" DECIMAL(65,30),
    "budgetPeriod" TEXT NOT NULL DEFAULT 'MONTHLY',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCategoryPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserTypeAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "detectedType" TEXT NOT NULL,
    "confidence" DECIMAL(65,30) NOT NULL,
    "analysisDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monthsAnalyzed" INTEGER NOT NULL,
    "totalTransactions" INTEGER NOT NULL,
    "spendingPatterns" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTypeAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SpendingAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "averageMonthly" DECIMAL(65,30) NOT NULL,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "transactionCount" INTEGER NOT NULL,
    "suggestedBudget" DECIMAL(65,30) NOT NULL,
    "analysisDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpendingAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserPreferenceChange" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "previousData" JSONB,
    "newData" JSONB NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPreferenceChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Category_mainGroup_idx" ON "public"."Category"("mainGroup");

-- CreateIndex
CREATE INDEX "Category_direction_idx" ON "public"."Category"("direction");

-- CreateIndex
CREATE INDEX "Category_isSystemDefault_idx" ON "public"."Category"("isSystemDefault");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "public"."Category"("name");

-- CreateIndex
CREATE INDEX "UserCategoryPreference_userId_enabled_idx" ON "public"."UserCategoryPreference"("userId", "enabled");

-- CreateIndex
CREATE INDEX "UserCategoryPreference_priority_idx" ON "public"."UserCategoryPreference"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "UserCategoryPreference_userId_categoryId_key" ON "public"."UserCategoryPreference"("userId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTypeAnalysis_userId_key" ON "public"."UserTypeAnalysis"("userId");

-- CreateIndex
CREATE INDEX "UserTypeAnalysis_detectedType_idx" ON "public"."UserTypeAnalysis"("detectedType");

-- CreateIndex
CREATE INDEX "UserTypeAnalysis_confidence_idx" ON "public"."UserTypeAnalysis"("confidence");

-- CreateIndex
CREATE INDEX "SpendingAnalysis_userId_period_idx" ON "public"."SpendingAnalysis"("userId", "period");

-- CreateIndex
CREATE INDEX "SpendingAnalysis_analysisDate_idx" ON "public"."SpendingAnalysis"("analysisDate");

-- CreateIndex
CREATE UNIQUE INDEX "SpendingAnalysis_userId_categoryId_period_key" ON "public"."SpendingAnalysis"("userId", "categoryId", "period");

-- CreateIndex
CREATE INDEX "UserPreferenceChange_userId_changeType_idx" ON "public"."UserPreferenceChange"("userId", "changeType");

-- CreateIndex
CREATE INDEX "UserPreferenceChange_createdAt_idx" ON "public"."UserPreferenceChange"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."UserCategoryPreference" ADD CONSTRAINT "UserCategoryPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserCategoryPreference" ADD CONSTRAINT "UserCategoryPreference_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserTypeAnalysis" ADD CONSTRAINT "UserTypeAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SpendingAnalysis" ADD CONSTRAINT "SpendingAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SpendingAnalysis" ADD CONSTRAINT "SpendingAnalysis_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserPreferenceChange" ADD CONSTRAINT "UserPreferenceChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
