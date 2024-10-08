ALTER TABLE `purchase` 
CHANGE `created_at` `old_created_at` DATETIME(3), 
CHANGE `remarks` `old_remarks` VARCHAR(255), 
CHANGE `roundOff` `old_roundOff` DECIMAL(10,2), 
CHANGE `updated_at` `old_updated_at` DATETIME(3);

-- Adding new columns
ALTER TABLE `purchase` 
ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- For purchaseitem table
ALTER TABLE `purchaseitem` 
CHANGE `created_at` `old_created_at` DATETIME(3),
CHANGE `updated_at` `old_updated_at` DATETIME(3);
