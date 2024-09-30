/*
  Warnings:

  - You are about to drop the column `branchId` on the `product` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `product` DROP FOREIGN KEY `Product_branchId_fkey`;

-- AlterTable
ALTER TABLE `product` DROP COLUMN `branchId`;

-- CreateTable
CREATE TABLE `_BranchProducts` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_BranchProducts_AB_unique`(`A`, `B`),
    INDEX `_BranchProducts_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_BranchProducts` ADD CONSTRAINT `_BranchProducts_A_fkey` FOREIGN KEY (`A`) REFERENCES `Branch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_BranchProducts` ADD CONSTRAINT `_BranchProducts_B_fkey` FOREIGN KEY (`B`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
