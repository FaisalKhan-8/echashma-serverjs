/*
  Warnings:

  - You are about to drop the column `aaharcard` on the `companies` table. All the data in the column will be lost.
  - Added the required column `aadhaarcard` to the `Companies` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `companies` DROP COLUMN `aaharcard`,
    ADD COLUMN `aadhaarcard` VARCHAR(191) NOT NULL;
