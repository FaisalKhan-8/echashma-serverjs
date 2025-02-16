/*
  Warnings:

  - You are about to drop the column `leftEye` on the `CustomerInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `rightEye` on the `CustomerInvoice` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CustomerInvoice" DROP COLUMN "leftEye",
DROP COLUMN "rightEye";

-- AlterTable
ALTER TABLE "CustomerInvoiceItem" ADD COLUMN     "leftEye" JSONB,
ADD COLUMN     "rightEye" JSONB;
