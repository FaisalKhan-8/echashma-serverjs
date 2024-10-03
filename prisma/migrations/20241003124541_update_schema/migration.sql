/*
  Warnings:

  - You are about to drop the `companies` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `expences` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `_usercompanies` DROP FOREIGN KEY `_UserCompanies_A_fkey`;

-- DropForeignKey
ALTER TABLE `branch` DROP FOREIGN KEY `Branch_companyId_fkey`;

-- DropTable
DROP TABLE `companies`;

-- DropTable
DROP TABLE `expences`;

-- CreateTable
CREATE TABLE `Company` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyName` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `contactPerson` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `gst` VARCHAR(191) NULL,
    `pancard` VARCHAR(191) NOT NULL,
    `aadhaarcard` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `uuid` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Company_companyName_key`(`companyName`),
    UNIQUE INDEX `Company_email_key`(`email`),
    UNIQUE INDEX `Company_gst_key`(`gst`),
    UNIQUE INDEX `Company_uuid_key`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Expense` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Branch` ADD CONSTRAINT `Branch_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_UserCompanies` ADD CONSTRAINT `_UserCompanies_A_fkey` FOREIGN KEY (`A`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
