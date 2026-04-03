/*
  Warnings:

  - You are about to drop the column `shapeTypeId` on the `CustomerInvoiceItem` table. All the data in the column will be lost.
  - You are about to drop the column `shapeTypeId` on the `Inventory` table. All the data in the column will be lost.
  - You are about to drop the column `shapeTypeId` on the `PurchaseItem` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[CustomerInvoiceItem] DROP CONSTRAINT [CustomerInvoiceItem_shapeTypeId_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[Inventory] DROP CONSTRAINT [Inventory_shapeTypeId_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[PurchaseItem] DROP CONSTRAINT [PurchaseItem_shapeTypeId_fkey];

-- AlterTable
ALTER TABLE [dbo].[CustomerInvoiceItem] DROP COLUMN [shapeTypeId];

-- AlterTable
ALTER TABLE [dbo].[Inventory] DROP COLUMN [shapeTypeId];

-- AlterTable
ALTER TABLE [dbo].[PurchaseItem] DROP COLUMN [shapeTypeId];

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
