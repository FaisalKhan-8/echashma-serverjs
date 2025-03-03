-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "frameTypeId" INTEGER,
ADD COLUMN     "shapeTypeId" INTEGER,
ADD COLUMN     "visionTypeId" INTEGER;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_frameTypeId_fkey" FOREIGN KEY ("frameTypeId") REFERENCES "FrameType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_shapeTypeId_fkey" FOREIGN KEY ("shapeTypeId") REFERENCES "ShapeType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_visionTypeId_fkey" FOREIGN KEY ("visionTypeId") REFERENCES "VisionType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
