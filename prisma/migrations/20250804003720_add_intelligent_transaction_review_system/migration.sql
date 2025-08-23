/*
  Warnings:

  - A unique constraint covering the columns `[plaidTransactionId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Transaction" ADD COLUMN     "assignedCategory" TEXT,
ADD COLUMN     "confidence" DECIMAL(65,30),
ADD COLUMN     "direction" TEXT,
ADD COLUMN     "merchantName" TEXT,
ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "originalText" TEXT,
ADD COLUMN     "plaidTransactionId" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'UPLOADED',
ADD COLUMN     "transactionDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."TransactionPattern" (
    "id" TEXT NOT NULL,
    "merchantPattern" TEXT NOT NULL,
    "descriptionPattern" TEXT,
    "amountRangeMin" DECIMAL(65,30),
    "amountRangeMax" DECIMAL(65,30),
    "plaidCategory" TEXT,
    "plaidConfidence" DECIMAL(65,30),
    "chatgptCategory" TEXT,
    "chatgptConfidence" DECIMAL(65,30),
    "chatgptReasoning" TEXT,
    "userCategory" TEXT,
    "userCorrectionCount" INTEGER NOT NULL DEFAULT 0,
    "userCorrelationRate" DECIMAL(65,30) NOT NULL DEFAULT 100.00,
    "finalCategory" TEXT NOT NULL,
    "combinedConfidence" DECIMAL(65,30) NOT NULL,
    "userId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalOccurrences" INTEGER NOT NULL DEFAULT 1,
    "lastChatgptCallAt" TIMESTAMP(3),

    CONSTRAINT "TransactionPattern_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransactionPattern_userId_merchantPattern_idx" ON "public"."TransactionPattern"("userId", "merchantPattern");

-- CreateIndex
CREATE INDEX "TransactionPattern_combinedConfidence_idx" ON "public"."TransactionPattern"("combinedConfidence");

-- CreateIndex
CREATE INDEX "TransactionPattern_lastSeenAt_idx" ON "public"."TransactionPattern"("lastSeenAt");

-- CreateIndex
CREATE INDEX "TransactionPattern_userId_direction_idx" ON "public"."TransactionPattern"("userId", "direction");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_plaidTransactionId_key" ON "public"."Transaction"("plaidTransactionId");

-- CreateIndex
CREATE INDEX "Transaction_needsReview_idx" ON "public"."Transaction"("needsReview");

-- CreateIndex
CREATE INDEX "Transaction_transactionDate_idx" ON "public"."Transaction"("transactionDate");

-- CreateIndex
CREATE INDEX "Transaction_plaidTransactionId_idx" ON "public"."Transaction"("plaidTransactionId");

-- CreateIndex
CREATE INDEX "Transaction_userId_needsReview_idx" ON "public"."Transaction"("userId", "needsReview");

-- AddForeignKey
ALTER TABLE "public"."TransactionPattern" ADD CONSTRAINT "TransactionPattern_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
