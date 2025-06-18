-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "exported" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "exportedAt" TIMESTAMP(3),
ADD COLUMN     "monthlySheetId" TEXT;

-- CreateTable
CREATE TABLE "MonthlySheet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "spreadsheetId" TEXT NOT NULL,
    "sheetName" TEXT NOT NULL,
    "sheetUrl" TEXT,
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlySheet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthlySheet_userId_idx" ON "MonthlySheet"("userId");

-- CreateIndex
CREATE INDEX "MonthlySheet_monthKey_idx" ON "MonthlySheet"("monthKey");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlySheet_userId_monthKey_key" ON "MonthlySheet"("userId", "monthKey");

-- CreateIndex
CREATE INDEX "Transaction_monthlySheetId_idx" ON "Transaction"("monthlySheetId");

-- CreateIndex
CREATE INDEX "Transaction_exported_idx" ON "Transaction"("exported");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_monthlySheetId_fkey" FOREIGN KEY ("monthlySheetId") REFERENCES "MonthlySheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlySheet" ADD CONSTRAINT "MonthlySheet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
