/*
  Warnings:

  - You are about to drop the column `DOB` on the `CustomerInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `DOM` on the `CustomerInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `LRC` on the `CustomerInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `CustomerInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `CustomerInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `lensType` on the `CustomerInvoice` table. All the data in the column will be lost.
  - Added the required column `advance` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `balance` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerLocation` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discountAmount` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `grandTotal` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orderDate` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `products` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `testedBy` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CustomerInvoice" DROP CONSTRAINT "CustomerInvoice_productId_fkey";

-- AlterTable
ALTER TABLE "CustomerInvoice" DROP COLUMN "DOB",
DROP COLUMN "DOM",
DROP COLUMN "LRC",
DROP COLUMN "address",
DROP COLUMN "email",
DROP COLUMN "lensType",
ADD COLUMN     "advance" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "balance" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "customerLocation" TEXT NOT NULL,
ADD COLUMN     "discountAmount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "grandTotal" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "orderDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "products" JSONB NOT NULL,
ADD COLUMN     "testedBy" TEXT NOT NULL,
ALTER COLUMN "productId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "CustomerInvoice" ADD CONSTRAINT "CustomerInvoice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
