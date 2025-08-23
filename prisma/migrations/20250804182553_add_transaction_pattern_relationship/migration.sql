-- AlterTable
ALTER TABLE "public"."Transaction" ADD COLUMN     "transactionPatternId" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_transactionPatternId_idx" ON "public"."Transaction"("transactionPatternId");

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_transactionPatternId_fkey" FOREIGN KEY ("transactionPatternId") REFERENCES "public"."TransactionPattern"("id") ON DELETE SET NULL ON UPDATE CASCADE;
