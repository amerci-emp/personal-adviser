/*
  Warnings:

  - The primary key for the `Task` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `status` column on the `UserTask` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[priority]` on the table `Task` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `Task` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `taskId` on the `UserTask` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."TaskType" AS ENUM ('ONBOARDING', 'AI_SUGGESTION', 'GENERAL');

-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('PENDING', 'COMPLETED');

-- DropForeignKey
ALTER TABLE "public"."UserTask" DROP CONSTRAINT "UserTask_taskId_fkey";

-- AlterTable
ALTER TABLE "public"."Task" DROP CONSTRAINT "Task_pkey",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "type" "public"."TaskType" NOT NULL DEFAULT 'ONBOARDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "Task_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."UserTask" ADD COLUMN     "completedAt" TIMESTAMP(3),
DROP COLUMN "taskId",
ADD COLUMN     "taskId" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "public"."TaskStatus" NOT NULL DEFAULT 'PENDING';

-- DropEnum
DROP TYPE "public"."TaskId";

-- DropEnum
DROP TYPE "public"."UserTaskStatus";

-- CreateIndex
CREATE UNIQUE INDEX "Task_priority_key" ON "public"."Task"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "UserTask_userId_taskId_key" ON "public"."UserTask"("userId", "taskId");

-- AddForeignKey
ALTER TABLE "public"."UserTask" ADD CONSTRAINT "UserTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
