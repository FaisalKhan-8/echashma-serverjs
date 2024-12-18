/*
  Warnings:

  - You are about to drop the `_BranchProducts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_BranchProducts" DROP CONSTRAINT "_BranchProducts_A_fkey";

-- DropForeignKey
ALTER TABLE "_BranchProducts" DROP CONSTRAINT "_BranchProducts_B_fkey";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "companyId" INTEGER;

-- DropTable
DROP TABLE "_BranchProducts";

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
