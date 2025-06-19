/*
  Warnings:

  - You are about to drop the column `needsReview` on the `Statement` table. All the data in the column will be lost.
  - You are about to drop the column `reviewCompleted` on the `Statement` table. All the data in the column will be lost.
  - You are about to drop the column `reviewStarted` on the `Statement` table. All the data in the column will be lost.
  - You are about to drop the `ReviewSession` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ReviewSession" DROP CONSTRAINT "ReviewSession_statementId_fkey";

-- DropForeignKey
ALTER TABLE "ReviewSession" DROP CONSTRAINT "ReviewSession_userId_fkey";

-- DropIndex
DROP INDEX "Statement_needsReview_idx";

-- AlterTable
ALTER TABLE "Statement" DROP COLUMN "needsReview",
DROP COLUMN "reviewCompleted",
DROP COLUMN "reviewStarted",
ADD COLUMN     "googleSheetsId" TEXT,
ADD COLUMN     "googleSheetsUrl" TEXT;

-- DropTable
DROP TABLE "ReviewSession";

-- CreateIndex
CREATE INDEX "Statement_googleSheetsId_idx" ON "Statement"("googleSheetsId");
