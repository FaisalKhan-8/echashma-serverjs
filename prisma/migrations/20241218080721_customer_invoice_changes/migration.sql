/*
  Warnings:

  - You are about to drop the column `discount` on the `CustomerInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `discountAmount` on the `CustomerInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `prescription` on the `CustomerInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `products` on the `CustomerInvoice` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CustomerInvoice" DROP COLUMN "discount",
DROP COLUMN "discountAmount",
DROP COLUMN "prescription",
DROP COLUMN "products";

-- CreateTable
CREATE TABLE "CustomerInvoiceItem" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION DEFAULT 0,
    "modalNo" TEXT NOT NULL,
    "frameTypeId" INTEGER NOT NULL,
    "shapeTypeId" INTEGER NOT NULL,
    "brandId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CustomerInvoiceItem" ADD CONSTRAINT "CustomerInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CustomerInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInvoiceItem" ADD CONSTRAINT "CustomerInvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInvoiceItem" ADD CONSTRAINT "CustomerInvoiceItem_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInvoiceItem" ADD CONSTRAINT "CustomerInvoiceItem_frameTypeId_fkey" FOREIGN KEY ("frameTypeId") REFERENCES "FrameType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInvoiceItem" ADD CONSTRAINT "CustomerInvoiceItem_shapeTypeId_fkey" FOREIGN KEY ("shapeTypeId") REFERENCES "ShapeType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
