-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('COMPANY', 'FREELANCER', 'INDIVIDUAL', 'PUBLIC_ENTITY', 'OTHER');

-- CreateEnum
CREATE TYPE "TaxIdType" AS ENUM ('NIF', 'CIF', 'NIE', 'VAT', 'PASSPORT', 'OTHER');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "city" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "countryCode" TEXT NOT NULL DEFAULT 'ES',
ADD COLUMN     "invoicingEmail" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paymentTermsDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "province" TEXT,
ADD COLUMN     "taxIdType" "TaxIdType" NOT NULL DEFAULT 'CIF',
ADD COLUMN     "tradeName" TEXT,
ADD COLUMN     "type" "ClientType" NOT NULL DEFAULT 'COMPANY';

-- CreateIndex
CREATE INDEX "Client_companyId_idx" ON "Client"("companyId");

-- CreateIndex
CREATE INDEX "Client_companyId_active_idx" ON "Client"("companyId", "active");

-- CreateIndex
CREATE INDEX "Client_companyId_nif_idx" ON "Client"("companyId", "nif");
