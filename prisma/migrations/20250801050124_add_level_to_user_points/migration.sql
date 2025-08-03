/*
  Warnings:

  - You are about to drop the column `aiProfile` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `isAiEnabled` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `quizAnswers` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "aiProfile",
DROP COLUMN "isAiEnabled",
DROP COLUMN "quizAnswers";

-- AlterTable
ALTER TABLE "public"."UserPoints" ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1;
