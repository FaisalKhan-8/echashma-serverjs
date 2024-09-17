-- AlterTable
ALTER TABLE `user` ADD COLUMN `companyId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
