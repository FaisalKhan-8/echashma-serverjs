/*
  Warnings:

  - You are about to drop the column `branchId` on the `Purchase` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Purchase" DROP CONSTRAINT "Purchase_branchId_fkey";

-- AlterTable
ALTER TABLE "Purchase" DROP COLUMN "branchId";

-- AlterTable
ALTER TABLE "PurchaseItem" ADD COLUMN     "brandsId" INTEGER,
ADD COLUMN     "frameTypeId" INTEGER,
ADD COLUMN     "shapeTypeId" INTEGER;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_brandsId_fkey" FOREIGN KEY ("brandsId") REFERENCES "Brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_frameTypeId_fkey" FOREIGN KEY ("frameTypeId") REFERENCES "FrameType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_shapeTypeId_fkey" FOREIGN KEY ("shapeTypeId") REFERENCES "ShapeType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
