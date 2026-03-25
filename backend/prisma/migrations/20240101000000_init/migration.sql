-- CreateEnum
CREATE TYPE "Status" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "Tag" AS ENUM ('DEV', 'TEST', 'DESIGN', 'DOC', 'BUG', 'OPS');

-- CreateEnum
CREATE TYPE "ArchiveReason" AS ENUM ('AUTO', 'WEEK_CLOSE');

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "status" "Status" NOT NULL DEFAULT 'TODO',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "tag" "Tag" NOT NULL DEFAULT 'DEV',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchivedTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "priority" "Priority" NOT NULL,
    "tag" "Tag" NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archiveReason" "ArchiveReason" NOT NULL DEFAULT 'AUTO',

    CONSTRAINT "ArchivedTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeekMeta" (
    "id" INTEGER NOT NULL,
    "weekNumber" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeekMeta_pkey" PRIMARY KEY ("id")
);
