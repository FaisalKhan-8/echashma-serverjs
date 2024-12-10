/*
  Warnings:

  - You are about to drop the column `billNo` on the `CustomerInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `leftADD` on the `CustomerInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `leftAXIS` on the `CustomerInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `leftCYL` on the `CustomerInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `leftSPH` on the `CustomerInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `rightADD` on the `CustomerInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `rightAXIS` on the `CustomerInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `rightCYL` on the `CustomerInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `rightSPH` on the `CustomerInvoice` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[orderNo]` on the table `CustomerInvoice` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `prescription` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CustomerInvoice" DROP CONSTRAINT "CustomerInvoice_brandId_fkey";

-- DropForeignKey
ALTER TABLE "CustomerInvoice" DROP CONSTRAINT "CustomerInvoice_frameTypeId_fkey";

-- DropForeignKey
ALTER TABLE "CustomerInvoice" DROP CONSTRAINT "CustomerInvoice_shapeId_fkey";

-- DropIndex
DROP INDEX "CustomerInvoice_billNo_key";

-- AlterTable
ALTER TABLE "CustomerInvoice" DROP COLUMN "billNo",
DROP COLUMN "leftADD",
DROP COLUMN "leftAXIS",
DROP COLUMN "leftCYL",
DROP COLUMN "leftSPH",
DROP COLUMN "rightADD",
DROP COLUMN "rightAXIS",
DROP COLUMN "rightCYL",
DROP COLUMN "rightSPH",
ADD COLUMN     "prescription" JSONB NOT NULL,
ALTER COLUMN "brandId" DROP NOT NULL,
ALTER COLUMN "discount" SET DEFAULT 0,
ALTER COLUMN "frameTypeId" DROP NOT NULL,
ALTER COLUMN "quantity" DROP NOT NULL,
ALTER COLUMN "rate" DROP NOT NULL,
ALTER COLUMN "shapeId" DROP NOT NULL,
ALTER COLUMN "discountAmount" SET DEFAULT 0,
ALTER COLUMN "testedBy" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CustomerInvoice_orderNo_key" ON "CustomerInvoice"("orderNo");

-- AddForeignKey
ALTER TABLE "CustomerInvoice" ADD CONSTRAINT "CustomerInvoice_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInvoice" ADD CONSTRAINT "CustomerInvoice_frameTypeId_fkey" FOREIGN KEY ("frameTypeId") REFERENCES "FrameType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInvoice" ADD CONSTRAINT "CustomerInvoice_shapeId_fkey" FOREIGN KEY ("shapeId") REFERENCES "ShapeType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
