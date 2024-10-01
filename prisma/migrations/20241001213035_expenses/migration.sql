/*
  Warnings:

  - You are about to drop the column `Rent` on the `expences` table. All the data in the column will be lost.
  - You are about to drop the column `Salary` on the `expences` table. All the data in the column will be lost.
  - You are about to drop the column `tea` on the `expences` table. All the data in the column will be lost.
  - Added the required column `amount` to the `Expences` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `Expences` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Expences` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `expences` DROP COLUMN `Rent`,
    DROP COLUMN `Salary`,
    DROP COLUMN `tea`,
    ADD COLUMN `amount` DOUBLE NOT NULL,
    ADD COLUMN `description` VARCHAR(191) NOT NULL,
    ADD COLUMN `name` VARCHAR(191) NOT NULL;
