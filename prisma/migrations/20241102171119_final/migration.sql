/*
  Warnings:

  - You are about to drop the `sysdiagrams` table. If the table is not empty, all the data it contains will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropTable
DROP TABLE [dbo].[sysdiagrams];

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000),
    [email] NVARCHAR(1000) NOT NULL,
    [password] NVARCHAR(1000) NOT NULL,
    [avatar] NVARCHAR(1000) CONSTRAINT [User_avatar_df] DEFAULT 'https://img.freepik.com/free-vector/illustration-businessman_53876-5856.jpg',
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [User_role_df] DEFAULT 'SUBADMIN',
    [created_at] DATETIME2 NOT NULL CONSTRAINT [User_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [User_updated_at_df] DEFAULT CURRENT_TIMESTAMP,
    [uuid] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email]),
    CONSTRAINT [User_uuid_key] UNIQUE NONCLUSTERED ([uuid])
);

-- CreateTable
CREATE TABLE [dbo].[Company] (
    [id] INT NOT NULL IDENTITY(1,1),
    [companyName] NVARCHAR(1000) NOT NULL,
    [address] NVARCHAR(1000) NOT NULL,
    [contactPerson] NVARCHAR(1000) NOT NULL,
    [phone] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [gst] NVARCHAR(1000),
    [pancard] NVARCHAR(1000) NOT NULL,
    [aadhaarcard] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Company_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [Company_updated_at_df] DEFAULT CURRENT_TIMESTAMP,
    [uuid] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [Company_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Company_companyName_key] UNIQUE NONCLUSTERED ([companyName]),
    CONSTRAINT [Company_email_key] UNIQUE NONCLUSTERED ([email]),
    CONSTRAINT [Company_gst_key] UNIQUE NONCLUSTERED ([gst]),
    CONSTRAINT [Company_uuid_key] UNIQUE NONCLUSTERED ([uuid])
);

-- CreateTable
CREATE TABLE [dbo].[Branch] (
    [id] INT NOT NULL IDENTITY(1,1),
    [branchName] NVARCHAR(1000) NOT NULL,
    [address] NVARCHAR(1000) NOT NULL,
    [phone] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000),
    [contactPerson] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Branch_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    [uuid] NVARCHAR(1000) NOT NULL,
    [companyId] INT NOT NULL,
    CONSTRAINT [Branch_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Branch_email_key] UNIQUE NONCLUSTERED ([email]),
    CONSTRAINT [Branch_uuid_key] UNIQUE NONCLUSTERED ([uuid])
);

-- CreateTable
CREATE TABLE [dbo].[Product] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [frameTypeId] INT NOT NULL,
    [shapeTypeId] INT NOT NULL,
    [visionTypeId] INT NOT NULL,
    [coatingTypeId] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Product_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [Product_updated_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Product_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Supplier] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [address] NVARCHAR(1000) NOT NULL,
    [contactPerson] NVARCHAR(1000) NOT NULL,
    [contactNo] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [gstin] NVARCHAR(1000),
    [uin] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Supplier_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    [uuid] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [Supplier_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Supplier_email_key] UNIQUE NONCLUSTERED ([email]),
    CONSTRAINT [Supplier_gstin_key] UNIQUE NONCLUSTERED ([gstin]),
    CONSTRAINT [Supplier_uuid_key] UNIQUE NONCLUSTERED ([uuid])
);

-- CreateTable
CREATE TABLE [dbo].[FrameType] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [FrameType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ShapeType] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [ShapeType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[VisionType] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [VisionType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[CoatingType] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [CoatingType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Purchase] (
    [id] INT NOT NULL IDENTITY(1,1),
    [purchaseDate] DATETIME2 NOT NULL,
    [billNo] NVARCHAR(1000) NOT NULL,
    [supplierId] INT NOT NULL,
    [totalAmount] FLOAT(53) NOT NULL,
    [totalCGST] FLOAT(53),
    [totalSGST] FLOAT(53),
    [netTotal] FLOAT(53) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Purchase_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Purchase_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PurchaseItem] (
    [id] INT NOT NULL IDENTITY(1,1),
    [purchaseId] INT NOT NULL,
    [productId] INT NOT NULL,
    [quantity] INT NOT NULL,
    [rate] FLOAT(53) NOT NULL,
    [amount] FLOAT(53) NOT NULL,
    [cgst] FLOAT(53),
    [sgst] FLOAT(53),
    [discount] FLOAT(53) CONSTRAINT [PurchaseItem_discount_df] DEFAULT 0,
    CONSTRAINT [PurchaseItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ExpenseCategory] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ExpenseCategory_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [ExpenseCategory_updated_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ExpenseCategory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Expense] (
    [id] INT NOT NULL IDENTITY(1,1),
    [amount] FLOAT(53) NOT NULL,
    [description] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Expense_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    [categoryId] INT NOT NULL,
    CONSTRAINT [Expense_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[_UserCompanies] (
    [A] INT NOT NULL,
    [B] INT NOT NULL,
    CONSTRAINT [_UserCompanies_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateTable
CREATE TABLE [dbo].[_UserBranches] (
    [A] INT NOT NULL,
    [B] INT NOT NULL,
    CONSTRAINT [_UserBranches_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateTable
CREATE TABLE [dbo].[_BranchProducts] (
    [A] INT NOT NULL,
    [B] INT NOT NULL,
    CONSTRAINT [_BranchProducts_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateTable
CREATE TABLE [dbo].[_ProductSuppliers] (
    [A] INT NOT NULL,
    [B] INT NOT NULL,
    CONSTRAINT [_ProductSuppliers_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_UserCompanies_B_index] ON [dbo].[_UserCompanies]([B]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_UserBranches_B_index] ON [dbo].[_UserBranches]([B]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_BranchProducts_B_index] ON [dbo].[_BranchProducts]([B]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_ProductSuppliers_B_index] ON [dbo].[_ProductSuppliers]([B]);

-- AddForeignKey
ALTER TABLE [dbo].[Branch] ADD CONSTRAINT [Branch_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Product] ADD CONSTRAINT [Product_frameTypeId_fkey] FOREIGN KEY ([frameTypeId]) REFERENCES [dbo].[FrameType]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Product] ADD CONSTRAINT [Product_shapeTypeId_fkey] FOREIGN KEY ([shapeTypeId]) REFERENCES [dbo].[ShapeType]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Product] ADD CONSTRAINT [Product_visionTypeId_fkey] FOREIGN KEY ([visionTypeId]) REFERENCES [dbo].[VisionType]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Product] ADD CONSTRAINT [Product_coatingTypeId_fkey] FOREIGN KEY ([coatingTypeId]) REFERENCES [dbo].[CoatingType]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Purchase] ADD CONSTRAINT [Purchase_supplierId_fkey] FOREIGN KEY ([supplierId]) REFERENCES [dbo].[Supplier]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[PurchaseItem] ADD CONSTRAINT [PurchaseItem_purchaseId_fkey] FOREIGN KEY ([purchaseId]) REFERENCES [dbo].[Purchase]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[PurchaseItem] ADD CONSTRAINT [PurchaseItem_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Expense] ADD CONSTRAINT [Expense_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[ExpenseCategory]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_UserCompanies] ADD CONSTRAINT [_UserCompanies_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[Company]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_UserCompanies] ADD CONSTRAINT [_UserCompanies_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_UserBranches] ADD CONSTRAINT [_UserBranches_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[Branch]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_UserBranches] ADD CONSTRAINT [_UserBranches_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_BranchProducts] ADD CONSTRAINT [_BranchProducts_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[Branch]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_BranchProducts] ADD CONSTRAINT [_BranchProducts_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_ProductSuppliers] ADD CONSTRAINT [_ProductSuppliers_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_ProductSuppliers] ADD CONSTRAINT [_ProductSuppliers_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[Supplier]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
