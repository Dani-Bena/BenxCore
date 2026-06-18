-- AlterTable: add number columns
ALTER TABLE "Client" ADD COLUMN "number" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN "number" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "InvoiceSeries" ADD COLUMN "number" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "number" INTEGER NOT NULL DEFAULT 0;

-- Backfill: assign sequential numbers per company for existing data
UPDATE "Client" SET "number" = sub.rn FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "companyId" ORDER BY id) AS rn FROM "Client"
) sub WHERE "Client".id = sub.id;

UPDATE "Product" SET "number" = sub.rn FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "companyId" ORDER BY id) AS rn FROM "Product"
) sub WHERE "Product".id = sub.id;

UPDATE "InvoiceSeries" SET "number" = sub.rn FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "companyId" ORDER BY id) AS rn FROM "InvoiceSeries"
) sub WHERE "InvoiceSeries".id = sub.id;

UPDATE "Invoice" SET "number" = sub.rn FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "companyId" ORDER BY id) AS rn FROM "Invoice"
) sub WHERE "Invoice".id = sub.id;

-- CreateIndex: unique per company
CREATE UNIQUE INDEX "Client_companyId_number_key" ON "Client"("companyId", "number");
CREATE UNIQUE INDEX "Product_companyId_number_key" ON "Product"("companyId", "number");
CREATE UNIQUE INDEX "InvoiceSeries_companyId_number_key" ON "InvoiceSeries"("companyId", "number");
CREATE UNIQUE INDEX "Invoice_companyId_number_key" ON "Invoice"("companyId", "number");
