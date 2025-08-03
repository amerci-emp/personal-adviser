-- AlterTable
ALTER TABLE "User" ADD COLUMN     "aiProfile" JSONB,
ADD COLUMN     "isAiEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quizAnswers" JSONB;
