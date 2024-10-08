/*
  Warnings:

  - You are about to drop the column `old_created_at` on the `purchase` table. All the data in the column will be lost.
  - You are about to drop the column `old_remarks` on the `purchase` table. All the data in the column will be lost.
  - You are about to drop the column `old_roundOff` on the `purchase` table. All the data in the column will be lost.
  - You are about to drop the column `old_updated_at` on the `purchase` table. All the data in the column will be lost.
  - You are about to drop the column `discount` on the `purchaseitem` table. All the data in the column will be lost.
  - You are about to drop the column `old_created_at` on the `purchaseitem` table. All the data in the column will be lost.
  - You are about to drop the column `old_updated_at` on the `purchaseitem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `purchase` DROP COLUMN `old_created_at`,
    DROP COLUMN `old_remarks`,
    DROP COLUMN `old_roundOff`,
    DROP COLUMN `old_updated_at`;

-- AlterTable
ALTER TABLE `purchaseitem` DROP COLUMN `discount`,
    DROP COLUMN `old_created_at`,
    DROP COLUMN `old_updated_at`;
