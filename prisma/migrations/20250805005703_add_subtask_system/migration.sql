-- CreateEnum
CREATE TYPE "public"."SubTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateTable
CREATE TABLE "public"."SubTask" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserSubTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subTaskId" TEXT NOT NULL,
    "status" "public"."SubTaskStatus" NOT NULL DEFAULT 'PENDING',
    "data" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSubTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubTask_taskId_name_key" ON "public"."SubTask"("taskId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SubTask_taskId_orderIndex_key" ON "public"."SubTask"("taskId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "UserSubTask_userId_subTaskId_key" ON "public"."UserSubTask"("userId", "subTaskId");

-- AddForeignKey
ALTER TABLE "public"."SubTask" ADD CONSTRAINT "SubTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSubTask" ADD CONSTRAINT "UserSubTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSubTask" ADD CONSTRAINT "UserSubTask_subTaskId_fkey" FOREIGN KEY ("subTaskId") REFERENCES "public"."SubTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
