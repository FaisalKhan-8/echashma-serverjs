-- AlterTable
ALTER TABLE `purchase` MODIFY `totalCGST` DOUBLE NULL,
    MODIFY `totalSGST` DOUBLE NULL;

-- AlterTable
ALTER TABLE `purchaseitem` ADD COLUMN `cgst` DOUBLE NULL,
    ADD COLUMN `sgst` DOUBLE NULL;
