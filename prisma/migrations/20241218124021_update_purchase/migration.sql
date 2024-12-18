/*
  Warnings:

  - You are about to drop the column `userId` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `brandsId` on the `PurchaseItem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Purchase" DROP CONSTRAINT "Purchase_userId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseItem" DROP CONSTRAINT "PurchaseItem_brandsId_fkey";

-- AlterTable
ALTER TABLE "Purchase" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "PurchaseItem" DROP COLUMN "brandsId",
ADD COLUMN     "brandId" INTEGER;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;
