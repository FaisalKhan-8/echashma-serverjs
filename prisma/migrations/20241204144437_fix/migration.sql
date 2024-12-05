/*
  Warnings:

  - You are about to drop the column `createdBy` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `_UserCompanies` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `companyId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "_UserCompanies" DROP CONSTRAINT "_UserCompanies_A_fkey";

-- DropForeignKey
ALTER TABLE "_UserCompanies" DROP CONSTRAINT "_UserCompanies_B_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "createdBy",
ADD COLUMN     "companyId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "_UserCompanies";

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
