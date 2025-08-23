/*
  Warnings:

  - You are about to drop the column `assignedCategory` on the `Transaction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Transaction" DROP COLUMN "assignedCategory",
ADD COLUMN     "plaidCategories" TEXT[];
