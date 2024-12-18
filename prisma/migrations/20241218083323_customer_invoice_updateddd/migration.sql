/*
  Warnings:

  - You are about to drop the column `amount` on the `CustomerInvoice` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `CustomerInvoice` table. All the data in the column will be lost.
  - Added the required column `leftEye` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rightEye` to the `CustomerInvoice` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CustomerInvoice" DROP COLUMN "amount",
DROP COLUMN "quantity",
ADD COLUMN     "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "leftEye" JSONB NOT NULL,
ADD COLUMN     "rightEye" JSONB NOT NULL;
