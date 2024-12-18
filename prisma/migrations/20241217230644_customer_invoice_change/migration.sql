/*
  Warnings:

  - You are about to drop the column `brandId` on the `CustomerInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `frameTypeId` on the `CustomerInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `modalNo` on the `CustomerInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `CustomerInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `rate` on the `CustomerInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `shapeId` on the `CustomerInvoice` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "CustomerInvoice" DROP CONSTRAINT "CustomerInvoice_brandId_fkey";

-- DropForeignKey
ALTER TABLE "CustomerInvoice" DROP CONSTRAINT "CustomerInvoice_frameTypeId_fkey";

-- DropForeignKey
ALTER TABLE "CustomerInvoice" DROP CONSTRAINT "CustomerInvoice_productId_fkey";

-- DropForeignKey
ALTER TABLE "CustomerInvoice" DROP CONSTRAINT "CustomerInvoice_shapeId_fkey";

-- AlterTable
ALTER TABLE "CustomerInvoice" DROP COLUMN "brandId",
DROP COLUMN "frameTypeId",
DROP COLUMN "modalNo",
DROP COLUMN "productId",
DROP COLUMN "rate",
DROP COLUMN "shapeId";
