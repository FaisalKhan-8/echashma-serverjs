/*
  Warnings:

  - Made the column `companyId` on table `CustomerInvoice` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "CustomerInvoice" DROP CONSTRAINT "CustomerInvoice_companyId_fkey";

-- AlterTable
ALTER TABLE "CustomerInvoice" ALTER COLUMN "prescription" SET DEFAULT '{}',
ALTER COLUMN "companyId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "CustomerInvoice" ADD CONSTRAINT "CustomerInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
