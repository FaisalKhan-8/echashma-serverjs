/*
  Warnings:

  - You are about to drop the column `leftADD` on the `Prescription` table. All the data in the column will be lost.
  - You are about to drop the column `leftAXIS` on the `Prescription` table. All the data in the column will be lost.
  - You are about to drop the column `leftCYL` on the `Prescription` table. All the data in the column will be lost.
  - You are about to drop the column `leftSPH` on the `Prescription` table. All the data in the column will be lost.
  - You are about to drop the column `lensType` on the `Prescription` table. All the data in the column will be lost.
  - You are about to drop the column `rightADD` on the `Prescription` table. All the data in the column will be lost.
  - You are about to drop the column `rightAXIS` on the `Prescription` table. All the data in the column will be lost.
  - You are about to drop the column `rightCYL` on the `Prescription` table. All the data in the column will be lost.
  - You are about to drop the column `rightSPH` on the `Prescription` table. All the data in the column will be lost.
  - Added the required column `modalNo` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `modalNo` to the `PurchaseItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EyeSide" AS ENUM ('left', 'right');

-- CreateEnum
CREATE TYPE "PrescriptionField" AS ENUM ('SPH', 'CYL', 'AXIS', 'ADD');

-- DropIndex
DROP INDEX "Prescription_lensType_key";

-- AlterTable
ALTER TABLE "CustomerInvoice" ADD COLUMN     "modalNo" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Prescription" DROP COLUMN "leftADD",
DROP COLUMN "leftAXIS",
DROP COLUMN "leftCYL",
DROP COLUMN "leftSPH",
DROP COLUMN "lensType",
DROP COLUMN "rightADD",
DROP COLUMN "rightAXIS",
DROP COLUMN "rightCYL",
DROP COLUMN "rightSPH",
ADD COLUMN     "field" "PrescriptionField",
ADD COLUMN     "side" "EyeSide",
ADD COLUMN     "value" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "PurchaseItem" ADD COLUMN     "modalNo" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Inventory" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "modalNo" TEXT NOT NULL,
    "shapeTypeId" INTEGER,
    "brandsId" INTEGER,
    "frameTypeId" INTEGER,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_shapeTypeId_fkey" FOREIGN KEY ("shapeTypeId") REFERENCES "ShapeType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_brandsId_fkey" FOREIGN KEY ("brandsId") REFERENCES "Brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_frameTypeId_fkey" FOREIGN KEY ("frameTypeId") REFERENCES "FrameType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
