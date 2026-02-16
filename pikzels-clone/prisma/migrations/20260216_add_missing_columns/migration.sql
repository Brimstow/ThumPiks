-- AlterTable
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Thumbnail" ADD COLUMN IF NOT EXISTS "downloadCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Thumbnail" ADD COLUMN IF NOT EXISTS "editCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex (if not exists)
CREATE INDEX IF NOT EXISTS "Project_isArchived_idx" ON "Project"("isArchived");
