/*
  Warnings:

  - You are about to drop the column `companyId` on the `user` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `user` DROP FOREIGN KEY `User_companyId_fkey`;

-- AlterTable
ALTER TABLE `user` DROP COLUMN `companyId`;

-- CreateTable
CREATE TABLE `_UserCompanies` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_UserCompanies_AB_unique`(`A`, `B`),
    INDEX `_UserCompanies_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_UserCompanies` ADD CONSTRAINT `_UserCompanies_A_fkey` FOREIGN KEY (`A`) REFERENCES `Companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_UserCompanies` ADD CONSTRAINT `_UserCompanies_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
