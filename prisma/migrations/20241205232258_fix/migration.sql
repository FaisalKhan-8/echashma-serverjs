/*
  Warnings:

  - You are about to drop the column `created_at` on the `CustomerInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceDate` on the `CustomerInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceNo` on the `CustomerInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `CustomerInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `customerInvoiceId` on the `Prescription` table. All the data in the column will be lost.
  - You are about to drop the column `orderDate` on the `Prescription` table. All the data in the column will be lost.
  - You are about to drop the column `orderNo` on the `Prescription` table. All the data in the column will be lost.
  - You are about to drop the `Detail` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[billNo]` on the table `CustomerInvoice` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `amount` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `billNo` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `brandId` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discount` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `frameTypeId` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `leftADD` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `leftAXIS` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `leftCYL` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `leftSPH` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lensType` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orderNo` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productId` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rate` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rightADD` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rightAXIS` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rightCYL` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rightSPH` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shapeId` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `DOB` on the `CustomerInvoice` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `DOM` on the `CustomerInvoice` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `updatedAt` to the `Prescription` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Detail" DROP CONSTRAINT "Detail_brandId_fkey";

-- DropForeignKey
ALTER TABLE "Detail" DROP CONSTRAINT "Detail_customerInvoiceId_fkey";

-- DropForeignKey
ALTER TABLE "Detail" DROP CONSTRAINT "Detail_frameTypeId_fkey";

-- DropForeignKey
ALTER TABLE "Detail" DROP CONSTRAINT "Detail_shapeTypeId_fkey";

-- DropForeignKey
ALTER TABLE "Prescription" DROP CONSTRAINT "Prescription_customerInvoiceId_fkey";

-- DropIndex
DROP INDEX "CustomerInvoice_invoiceNo_key";

-- AlterTable
ALTER TABLE "CustomerInvoice" DROP COLUMN "created_at",
DROP COLUMN "invoiceDate",
DROP COLUMN "invoiceNo",
DROP COLUMN "updated_at",
ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "billNo" TEXT NOT NULL,
ADD COLUMN     "brandId" INTEGER NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "discount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "frameTypeId" INTEGER NOT NULL,
ADD COLUMN     "leftADD" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "leftAXIS" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "leftCYL" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "leftSPH" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "lensType" TEXT NOT NULL,
ADD COLUMN     "orderNo" TEXT NOT NULL,
ADD COLUMN     "productId" INTEGER NOT NULL,
ADD COLUMN     "quantity" INTEGER NOT NULL,
ADD COLUMN     "rate" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "rightADD" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "rightAXIS" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "rightCYL" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "rightSPH" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "shapeId" INTEGER NOT NULL,
ADD COLUMN     "totalAmount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "DOB",
ADD COLUMN     "DOB" TIMESTAMP(3) NOT NULL,
DROP COLUMN "DOM",
ADD COLUMN     "DOM" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Prescription" DROP COLUMN "customerInvoiceId",
DROP COLUMN "orderDate",
DROP COLUMN "orderNo",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "Detail";

-- CreateIndex
CREATE UNIQUE INDEX "CustomerInvoice_billNo_key" ON "CustomerInvoice"("billNo");

-- AddForeignKey
ALTER TABLE "CustomerInvoice" ADD CONSTRAINT "CustomerInvoice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInvoice" ADD CONSTRAINT "CustomerInvoice_frameTypeId_fkey" FOREIGN KEY ("frameTypeId") REFERENCES "FrameType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInvoice" ADD CONSTRAINT "CustomerInvoice_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInvoice" ADD CONSTRAINT "CustomerInvoice_shapeId_fkey" FOREIGN KEY ("shapeId") REFERENCES "ShapeType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
