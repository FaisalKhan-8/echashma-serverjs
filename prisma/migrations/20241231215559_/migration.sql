/*
  Warnings:

  - You are about to drop the column `totalCGST` on the `CustomerInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `totalSGST` on the `CustomerInvoice` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CustomerInvoice" DROP COLUMN "totalCGST",
DROP COLUMN "totalSGST";

-- AlterTable
ALTER TABLE "CustomerInvoiceItem" ADD COLUMN     "cgst" DOUBLE PRECISION,
ADD COLUMN     "sgst" DOUBLE PRECISION;
