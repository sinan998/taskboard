-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('CREATED', 'STATUS_CHANGED', 'UPDATED', 'DELETED', 'ARCHIVED_AUTO', 'ARCHIVED_WEEK_CLOSE');

-- AlterTable: Add isTodayTask and todayMarkedAt to Task
ALTER TABLE "Task" ADD COLUMN "isTodayTask" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Task" ADD COLUMN "todayMarkedAt" TIMESTAMP(3);

-- CreateTable: ActivityLog
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "taskTitle" TEXT NOT NULL,
    "action" "ActivityAction" NOT NULL,
    "fromStatus" "Status",
    "toStatus" "Status",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_taskId_idx" ON "ActivityLog"("taskId");
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateTable: ScratchPad
CREATE TABLE "ScratchPad" (
    "id" INTEGER NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScratchPad_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WeekReport
CREATE TABLE "WeekReport" (
    "id" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "totalCompleted" INTEGER NOT NULL,
    "totalCarried" INTEGER NOT NULL,
    "tagBreakdown" JSONB NOT NULL,
    "avgCompletionHours" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeekReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeekReport_weekNumber_key" ON "WeekReport"("weekNumber");
