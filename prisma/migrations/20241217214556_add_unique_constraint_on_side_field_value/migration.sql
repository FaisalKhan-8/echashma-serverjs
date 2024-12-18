/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Prescription` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Prescription` table. All the data in the column will be lost.
  - You are about to alter the column `value` on the `Prescription` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - A unique constraint covering the columns `[side,field,value]` on the table `Prescription` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `field` to the `Prescription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `side` to the `Prescription` table without a default value. This is not possible if the table is not empty.
  - Made the column `value` on table `Prescription` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Prescription_value_key";

-- AlterTable
ALTER TABLE "Prescription" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
DROP COLUMN "field",
ADD COLUMN     "field" TEXT NOT NULL,
DROP COLUMN "side",
ADD COLUMN     "side" TEXT NOT NULL,
ALTER COLUMN "value" SET NOT NULL,
ALTER COLUMN "value" SET DATA TYPE DOUBLE PRECISION;

-- CreateIndex
CREATE UNIQUE INDEX "Prescription_side_field_value_key" ON "Prescription"("side", "field", "value");
