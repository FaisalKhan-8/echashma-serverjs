/*
  Warnings:

  - You are about to drop the column `coatingTypeId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `frameTypeId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `shapeTypeId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `visionTypeId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the `_ProductSuppliers` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[branchName]` on the table `Branch` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `CoatingType` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `CoatingType` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `ExpenseCategory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `FrameType` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `FrameType` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[uuid]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `ShapeType` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `ShapeType` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `Supplier` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Supplier` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `VisionType` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `VisionType` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Product` table without a default value. This is not possible if the table is not empty.
  - The required column `uuid` was added to the `Product` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_coatingTypeId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_frameTypeId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_shapeTypeId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_visionTypeId_fkey";

-- DropForeignKey
ALTER TABLE "_ProductSuppliers" DROP CONSTRAINT "_ProductSuppliers_A_fkey";

-- DropForeignKey
ALTER TABLE "_ProductSuppliers" DROP CONSTRAINT "_ProductSuppliers_B_fkey";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "coatingTypeId",
DROP COLUMN "created_at",
DROP COLUMN "frameTypeId",
DROP COLUMN "shapeTypeId",
DROP COLUMN "updated_at",
DROP COLUMN "visionTypeId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" INTEGER,
ADD COLUMN     "uuid" TEXT NOT NULL;

-- DropTable
DROP TABLE "_ProductSuppliers";

-- CreateIndex
CREATE UNIQUE INDEX "Branch_branchName_key" ON "Branch"("branchName");

-- CreateIndex
CREATE UNIQUE INDEX "CoatingType_code_key" ON "CoatingType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CoatingType_name_key" ON "CoatingType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_name_key" ON "ExpenseCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FrameType_code_key" ON "FrameType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "FrameType_name_key" ON "FrameType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Product_uuid_key" ON "Product"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "ShapeType_code_key" ON "ShapeType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ShapeType_name_key" ON "ShapeType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_name_key" ON "Supplier"("name");

-- CreateIndex
CREATE UNIQUE INDEX "VisionType_code_key" ON "VisionType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "VisionType_name_key" ON "VisionType"("name");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
