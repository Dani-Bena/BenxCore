-- AlterTable: add number column
ALTER TABLE "User" ADD COLUMN "number" INTEGER NOT NULL DEFAULT 0;

-- Backfill: assign sequential numbers per company
UPDATE "User" SET "number" = sub.rn FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "companyId" ORDER BY id) AS rn FROM "User"
) sub WHERE "User".id = sub.id;

-- CreateIndex: unique per company
CREATE UNIQUE INDEX "User_companyId_number_key" ON "User"("companyId", "number");
