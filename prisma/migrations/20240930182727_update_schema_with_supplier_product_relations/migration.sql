/*
  Warnings:

  - You are about to drop the column `coatingType` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `frameType` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `shapeType` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `visionType` on the `product` table. All the data in the column will be lost.
  - Added the required column `coatingTypeId` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `frameTypeId` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shapeTypeId` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `visionTypeId` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `product` DROP COLUMN `coatingType`,
    DROP COLUMN `frameType`,
    DROP COLUMN `shapeType`,
    DROP COLUMN `visionType`,
    ADD COLUMN `coatingTypeId` INTEGER NOT NULL,
    ADD COLUMN `frameTypeId` INTEGER NOT NULL,
    ADD COLUMN `shapeTypeId` INTEGER NOT NULL,
    ADD COLUMN `visionTypeId` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `Supplier` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `contactPerson` VARCHAR(191) NOT NULL,
    `contactNo` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `gstin` VARCHAR(191) NULL,
    `uin` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `uuid` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Supplier_email_key`(`email`),
    UNIQUE INDEX `Supplier_gstin_key`(`gstin`),
    UNIQUE INDEX `Supplier_uuid_key`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FrameType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShapeType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VisionType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CoatingType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_ProductSuppliers` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_ProductSuppliers_AB_unique`(`A`, `B`),
    INDEX `_ProductSuppliers_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_frameTypeId_fkey` FOREIGN KEY (`frameTypeId`) REFERENCES `FrameType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_shapeTypeId_fkey` FOREIGN KEY (`shapeTypeId`) REFERENCES `ShapeType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_visionTypeId_fkey` FOREIGN KEY (`visionTypeId`) REFERENCES `VisionType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_coatingTypeId_fkey` FOREIGN KEY (`coatingTypeId`) REFERENCES `CoatingType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ProductSuppliers` ADD CONSTRAINT `_ProductSuppliers_A_fkey` FOREIGN KEY (`A`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ProductSuppliers` ADD CONSTRAINT `_ProductSuppliers_B_fkey` FOREIGN KEY (`B`) REFERENCES `Supplier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
