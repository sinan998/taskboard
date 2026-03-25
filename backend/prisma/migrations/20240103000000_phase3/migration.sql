-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('BLOCKS', 'RELATES_TO');

-- CreateTable: Project
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#a78bfa',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Board
CREATE TABLE "Board" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TaskRelation
CREATE TABLE "TaskRelation" (
    "id" TEXT NOT NULL,
    "fromTaskId" TEXT NOT NULL,
    "toTaskId" TEXT NOT NULL,
    "type" "RelationType" NOT NULL DEFAULT 'BLOCKS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskRelation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex unique on TaskRelation
CREATE UNIQUE INDEX "TaskRelation_fromTaskId_toTaskId_key" ON "TaskRelation"("fromTaskId", "toTaskId");

-- AlterTable: Add new fields to Task
ALTER TABLE "Task" ADD COLUMN "estimatedHours" DOUBLE PRECISION;
ALTER TABLE "Task" ADD COLUMN "projectId" TEXT;
ALTER TABLE "Task" ADD COLUMN "boardId" TEXT;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Add new columns to WeekReport
ALTER TABLE "WeekReport" ADD COLUMN "boardId" TEXT;
ALTER TABLE "WeekReport" ADD COLUMN "totalEstimatedHours" DOUBLE PRECISION;
ALTER TABLE "WeekReport" ADD COLUMN "totalActualHours" DOUBLE PRECISION;
