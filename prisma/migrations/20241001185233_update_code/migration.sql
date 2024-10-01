/*
  Warnings:

  - Added the required column `code` to the `CoatingType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `FrameType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `ShapeType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `Supplier` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `VisionType` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `coatingtype` ADD COLUMN `code` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `frametype` ADD COLUMN `code` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `product` MODIFY `code` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `shapetype` ADD COLUMN `code` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `supplier` ADD COLUMN `code` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `visiontype` ADD COLUMN `code` VARCHAR(191) NOT NULL;
