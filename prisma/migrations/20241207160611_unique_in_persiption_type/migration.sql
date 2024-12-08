/*
  Warnings:

  - A unique constraint covering the columns `[lensType]` on the table `Prescription` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Prescription_lensType_key" ON "Prescription"("lensType");
