/*
  Warnings:

  - A unique constraint covering the columns `[billNo]` on the table `Purchase` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Purchase_billNo_key" ON "Purchase"("billNo");
