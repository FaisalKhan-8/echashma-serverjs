BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(255),
    [email] VARCHAR(255) NOT NULL,
    [password] VARCHAR(255) NOT NULL,
    [avatar] VARCHAR(255) CONSTRAINT [User_avatar_df] DEFAULT 'https://img.freepik.com/free-vector/illustration-businessman_53876-5856.jpg',
    [role] VARCHAR(50) NOT NULL CONSTRAINT [User_role_df] DEFAULT 'MANAGER',
    [created_at] DATETIME2 NOT NULL CONSTRAINT [User_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [User_updated_at_df] DEFAULT CURRENT_TIMESTAMP,
    [uuid] UNIQUEIDENTIFIER NOT NULL,
    [companyId] INT,
    [password_visible] VARCHAR(255) NOT NULL,
    [resetPasswordExpires] DATETIME2,
    [resetPasswordToken] VARCHAR(255),
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email]),
    CONSTRAINT [User_uuid_key] UNIQUE NONCLUSTERED ([uuid])
);

-- CreateTable
CREATE TABLE [dbo].[Company] (
    [id] INT NOT NULL IDENTITY(1,1),
    [companyName] VARCHAR(255) NOT NULL,
    [address] VARCHAR(500),
    [contactPerson] VARCHAR(255) NOT NULL,
    [phone] VARCHAR(20),
    [email] VARCHAR(255) NOT NULL,
    [gst] VARCHAR(50),
    [pancard] VARCHAR(50),
    [aadhaarcard] VARCHAR(50),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Company_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [Company_updated_at_df] DEFAULT CURRENT_TIMESTAMP,
    [uuid] UNIQUEIDENTIFIER NOT NULL,
    [companyLogo] VARCHAR(255),
    [whatsappPhoneId] VARCHAR(255),
    [whatsappToken] VARCHAR(500),
    CONSTRAINT [Company_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Company_companyName_key] UNIQUE NONCLUSTERED ([companyName]),
    CONSTRAINT [Company_email_key] UNIQUE NONCLUSTERED ([email]),
    CONSTRAINT [Company_uuid_key] UNIQUE NONCLUSTERED ([uuid])
);

-- CreateTable
CREATE TABLE [dbo].[Branch] (
    [id] INT NOT NULL IDENTITY(1,1),
    [branchName] VARCHAR(255) NOT NULL,
    [address] VARCHAR(500) NOT NULL,
    [phone] VARCHAR(20) NOT NULL,
    [email] VARCHAR(255),
    [contactPerson] VARCHAR(255) NOT NULL,
    [negativeBilling] BIT CONSTRAINT [Branch_negativeBilling_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Branch_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    [uuid] UNIQUEIDENTIFIER NOT NULL,
    [companyId] INT NOT NULL,
    CONSTRAINT [Branch_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Branch_uuid_key] UNIQUE NONCLUSTERED ([uuid]),
    CONSTRAINT [Branch_branchName_companyId_key] UNIQUE NONCLUSTERED ([branchName],[companyId])
);

-- CreateTable
CREATE TABLE [dbo].[Product] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] VARCHAR(100) NOT NULL,
    [name] VARCHAR(255) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Product_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [userId] INT,
    [uuid] UNIQUEIDENTIFIER NOT NULL,
    [companyId] INT,
    [frameTypeId] INT,
    [shapeTypeId] INT,
    [visionTypeId] INT,
    [brandId] INT,
    CONSTRAINT [Product_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Product_uuid_key] UNIQUE NONCLUSTERED ([uuid])
);

-- CreateTable
CREATE TABLE [dbo].[Supplier] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] VARCHAR(100) NOT NULL,
    [name] VARCHAR(255) NOT NULL,
    [address] VARCHAR(500),
    [contactPerson] VARCHAR(255),
    [contactNo] VARCHAR(20),
    [email] VARCHAR(255),
    [gstin] VARCHAR(50),
    [uin] VARCHAR(50),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Supplier_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    [uuid] UNIQUEIDENTIFIER NOT NULL,
    [companyId] INT,
    CONSTRAINT [Supplier_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Supplier_code_key] UNIQUE NONCLUSTERED ([code]),
    CONSTRAINT [Supplier_name_key] UNIQUE NONCLUSTERED ([name]),
    CONSTRAINT [Supplier_uuid_key] UNIQUE NONCLUSTERED ([uuid])
);

-- CreateTable
CREATE TABLE [dbo].[FrameType] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] VARCHAR(100) NOT NULL,
    [name] VARCHAR(255) NOT NULL,
    [companyId] INT,
    CONSTRAINT [FrameType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ShapeType] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] VARCHAR(100) NOT NULL,
    [name] VARCHAR(255) NOT NULL,
    [companyId] INT,
    CONSTRAINT [ShapeType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[VisionType] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] VARCHAR(100) NOT NULL,
    [name] VARCHAR(255) NOT NULL,
    [companyId] INT,
    CONSTRAINT [VisionType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[CoatingType] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] VARCHAR(100) NOT NULL,
    [name] VARCHAR(255) NOT NULL,
    [companyId] INT,
    CONSTRAINT [CoatingType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Brands] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] VARCHAR(100) NOT NULL,
    [name] VARCHAR(255) NOT NULL,
    [companyId] INT,
    CONSTRAINT [Brands_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Purchase] (
    [id] INT NOT NULL IDENTITY(1,1),
    [purchaseDate] DATETIME2 NOT NULL,
    [billNo] VARCHAR(100) NOT NULL,
    [supplierId] INT NOT NULL,
    [totalAmount] DECIMAL(10,2) NOT NULL,
    [totalCGST] DECIMAL(10,2),
    [totalSGST] DECIMAL(10,2),
    [netTotal] DECIMAL(10,2) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Purchase_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [companyId] INT,
    [branchId] INT,
    [gstStatus] BIT NOT NULL CONSTRAINT [Purchase_gstStatus_df] DEFAULT 0,
    CONSTRAINT [Purchase_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PurchaseItem] (
    [id] INT NOT NULL IDENTITY(1,1),
    [purchaseId] INT NOT NULL,
    [productId] INT NOT NULL,
    [quantity] INT NOT NULL,
    [rate] DECIMAL(10,2) NOT NULL,
    [amount] DECIMAL(10,2) NOT NULL,
    [cgst] DECIMAL(10,2),
    [sgst] DECIMAL(10,2),
    [discount] DECIMAL(10,2) CONSTRAINT [PurchaseItem_discount_df] DEFAULT 0,
    [frameTypeId] INT,
    [modalNo] VARCHAR(100),
    [brandId] INT,
    [netAmount] DECIMAL(10,2),
    CONSTRAINT [PurchaseItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[CustomerInvoice] (
    [id] INT NOT NULL IDENTITY(1,1),
    [customerName] VARCHAR(255) NOT NULL,
    [customerPhone] VARCHAR(20) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [CustomerInvoice_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [orderNo] VARCHAR(100) NOT NULL,
    [totalAmount] DECIMAL(10,2) NOT NULL,
    [updatedAt] DATETIME2 NOT NULL,
    [advance] DECIMAL(10,2) NOT NULL,
    [balance] DECIMAL(10,2) NOT NULL,
    [customerLocation] VARCHAR(500) NOT NULL,
    [grandTotal] DECIMAL(10,2) NOT NULL,
    [orderDate] DATETIME2 NOT NULL,
    [testedBy] VARCHAR(255),
    [companyId] INT NOT NULL,
    [discount] DECIMAL(10,2) NOT NULL CONSTRAINT [CustomerInvoice_discount_df] DEFAULT 0,
    [branchId] INT,
    [totalCGST] DECIMAL(10,2) NOT NULL CONSTRAINT [CustomerInvoice_totalCGST_df] DEFAULT 0,
    [totalGST] DECIMAL(10,2) NOT NULL CONSTRAINT [CustomerInvoice_totalGST_df] DEFAULT 0,
    [totalSGST] DECIMAL(10,2) NOT NULL CONSTRAINT [CustomerInvoice_totalSGST_df] DEFAULT 0,
    CONSTRAINT [CustomerInvoice_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [CustomerInvoice_orderNo_key] UNIQUE NONCLUSTERED ([orderNo])
);

-- CreateTable
CREATE TABLE [dbo].[CustomerInvoiceItem] (
    [id] INT NOT NULL IDENTITY(1,1),
    [invoiceId] INT NOT NULL,
    [productId] INT NOT NULL,
    [quantity] INT NOT NULL,
    [rate] DECIMAL(10,2) NOT NULL,
    [amount] DECIMAL(10,2) NOT NULL,
    [discount] DECIMAL(10,2) CONSTRAINT [CustomerInvoiceItem_discount_df] DEFAULT 0,
    [modalNo] VARCHAR(100),
    [frameTypeId] INT NOT NULL,
    [visionTypeId] INT,
    [brandId] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [CustomerInvoiceItem_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [cgst] DECIMAL(10,2),
    [sgst] DECIMAL(10,2),
    [leftEye] NVARCHAR(max),
    [rightEye] NVARCHAR(max),
    CONSTRAINT [CustomerInvoiceItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Inventory] (
    [id] INT NOT NULL IDENTITY(1,1),
    [productId] INT NOT NULL,
    [modalNo] VARCHAR(100),
    [frameTypeId] INT,
    [stock] INT NOT NULL CONSTRAINT [Inventory_stock_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Inventory_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [brandId] INT,
    [companyId] INT NOT NULL,
    [branchId] INT,
    [price] INT,
    CONSTRAINT [Inventory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ExpenseCategory] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] VARCHAR(255) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ExpenseCategory_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [ExpenseCategory_updated_at_df] DEFAULT CURRENT_TIMESTAMP,
    [companyId] INT,
    CONSTRAINT [ExpenseCategory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Expense] (
    [id] INT NOT NULL IDENTITY(1,1),
    [amount] DECIMAL(10,2) NOT NULL,
    [description] VARCHAR(500),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Expense_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    [categoryId] INT NOT NULL,
    [companyId] INT,
    CONSTRAINT [Expense_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Prescription] (
    [id] INT NOT NULL IDENTITY(1,1),
    [value] DECIMAL(10,2) NOT NULL,
    [field] VARCHAR(50) NOT NULL,
    [side] VARCHAR(50) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Prescription_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Prescription_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Prescription_side_field_value_key] UNIQUE NONCLUSTERED ([side],[field],[value])
);

-- CreateTable
CREATE TABLE [dbo].[_UserBranches] (
    [A] INT NOT NULL,
    [B] INT NOT NULL,
    CONSTRAINT [_UserBranches_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateTable
CREATE TABLE [dbo].[_ProductToSupplier] (
    [A] INT NOT NULL,
    [B] INT NOT NULL,
    CONSTRAINT [_ProductToSupplier_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_UserBranches_B_index] ON [dbo].[_UserBranches]([B]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_ProductToSupplier_B_index] ON [dbo].[_ProductToSupplier]([B]);

-- AddForeignKey
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_Company_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Branch] ADD CONSTRAINT [Branch_Company_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Product] ADD CONSTRAINT [Product_brandId_fkey] FOREIGN KEY ([brandId]) REFERENCES [dbo].[Brands]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Product] ADD CONSTRAINT [Product_Company_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Product] ADD CONSTRAINT [Product_frameTypeId_fkey] FOREIGN KEY ([frameTypeId]) REFERENCES [dbo].[FrameType]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Product] ADD CONSTRAINT [Product_shapeTypeId_fkey] FOREIGN KEY ([shapeTypeId]) REFERENCES [dbo].[ShapeType]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Product] ADD CONSTRAINT [Product_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Product] ADD CONSTRAINT [Product_visionTypeId_fkey] FOREIGN KEY ([visionTypeId]) REFERENCES [dbo].[VisionType]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Product] ADD CONSTRAINT [Product_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Supplier] ADD CONSTRAINT [Supplier_Company_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[FrameType] ADD CONSTRAINT [FrameType_Company_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ShapeType] ADD CONSTRAINT [ShapeType_Company_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[VisionType] ADD CONSTRAINT [VisionType_Company_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CoatingType] ADD CONSTRAINT [CoatingType_Company_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Brands] ADD CONSTRAINT [Brands_Company_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Purchase] ADD CONSTRAINT [Purchase_branchId_fkey] FOREIGN KEY ([branchId]) REFERENCES [dbo].[Branch]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Purchase] ADD CONSTRAINT [Purchase_Company_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Purchase] ADD CONSTRAINT [Purchase_supplierId_fkey] FOREIGN KEY ([supplierId]) REFERENCES [dbo].[Supplier]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PurchaseItem] ADD CONSTRAINT [PurchaseItem_brandId_fkey] FOREIGN KEY ([brandId]) REFERENCES [dbo].[Brands]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PurchaseItem] ADD CONSTRAINT [PurchaseItem_frameTypeId_fkey] FOREIGN KEY ([frameTypeId]) REFERENCES [dbo].[FrameType]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PurchaseItem] ADD CONSTRAINT [PurchaseItem_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PurchaseItem] ADD CONSTRAINT [PurchaseItem_purchaseId_fkey] FOREIGN KEY ([purchaseId]) REFERENCES [dbo].[Purchase]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CustomerInvoice] ADD CONSTRAINT [CustomerInvoice_branchId_fkey] FOREIGN KEY ([branchId]) REFERENCES [dbo].[Branch]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CustomerInvoice] ADD CONSTRAINT [CustomerInvoice_Company_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CustomerInvoiceItem] ADD CONSTRAINT [CustomerInvoiceItem_brandId_fkey] FOREIGN KEY ([brandId]) REFERENCES [dbo].[Brands]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CustomerInvoiceItem] ADD CONSTRAINT [CustomerInvoiceItem_frameTypeId_fkey] FOREIGN KEY ([frameTypeId]) REFERENCES [dbo].[FrameType]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CustomerInvoiceItem] ADD CONSTRAINT [CustomerInvoiceItem_invoiceId_fkey] FOREIGN KEY ([invoiceId]) REFERENCES [dbo].[CustomerInvoice]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CustomerInvoiceItem] ADD CONSTRAINT [CustomerInvoiceItem_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CustomerInvoiceItem] ADD CONSTRAINT [CustomerInvoiceItem_visionTypeId_fkey] FOREIGN KEY ([visionTypeId]) REFERENCES [dbo].[VisionType]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Inventory] ADD CONSTRAINT [Inventory_branchId_fkey] FOREIGN KEY ([branchId]) REFERENCES [dbo].[Branch]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Inventory] ADD CONSTRAINT [Inventory_brandId_fkey] FOREIGN KEY ([brandId]) REFERENCES [dbo].[Brands]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Inventory] ADD CONSTRAINT [Inventory_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Inventory] ADD CONSTRAINT [Inventory_frameTypeId_fkey] FOREIGN KEY ([frameTypeId]) REFERENCES [dbo].[FrameType]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Inventory] ADD CONSTRAINT [Inventory_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ExpenseCategory] ADD CONSTRAINT [ExpenseCategory_Company_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Expense] ADD CONSTRAINT [Expense_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[ExpenseCategory]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Expense] ADD CONSTRAINT [Expense_Company_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[_UserBranches] ADD CONSTRAINT [_UserBranches_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[Branch]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_UserBranches] ADD CONSTRAINT [_UserBranches_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_ProductToSupplier] ADD CONSTRAINT [_ProductToSupplier_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_ProductToSupplier] ADD CONSTRAINT [_ProductToSupplier_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[Supplier]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
