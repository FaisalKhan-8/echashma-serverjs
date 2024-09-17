-- CreateTable
CREATE TABLE `Companies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyName` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `contactPerson` VARCHAR(191) NOT NULL,
    `phone` INTEGER NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `gst` VARCHAR(191) NULL,
    `pancard` VARCHAR(191) NOT NULL,
    `aaharcard` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `uuid` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Companies_companyName_key`(`companyName`),
    UNIQUE INDEX `Companies_email_key`(`email`),
    UNIQUE INDEX `Companies_gst_key`(`gst`),
    UNIQUE INDEX `Companies_uuid_key`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
