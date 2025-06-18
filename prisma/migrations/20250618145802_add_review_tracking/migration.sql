-- AlterTable
ALTER TABLE "Statement" ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reviewCompleted" TIMESTAMP(3),
ADD COLUMN     "reviewStarted" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ReviewSession" (
    "id" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "transactionsReviewed" INTEGER NOT NULL DEFAULT 0,
    "transactionsApproved" INTEGER NOT NULL DEFAULT 0,
    "transactionsRejected" INTEGER NOT NULL DEFAULT 0,
    "sessionDuration" INTEGER,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewSession_statementId_idx" ON "ReviewSession"("statementId");

-- CreateIndex
CREATE INDEX "ReviewSession_userId_idx" ON "ReviewSession"("userId");

-- CreateIndex
CREATE INDEX "ReviewSession_startedAt_idx" ON "ReviewSession"("startedAt");

-- CreateIndex
CREATE INDEX "ReviewSession_completedAt_idx" ON "ReviewSession"("completedAt");

-- CreateIndex
CREATE INDEX "Statement_needsReview_idx" ON "Statement"("needsReview");

-- AddForeignKey
ALTER TABLE "ReviewSession" ADD CONSTRAINT "ReviewSession_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "Statement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewSession" ADD CONSTRAINT "ReviewSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
