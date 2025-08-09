BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[CustomerInvoiceItem] ADD [visionTypeId] INT;

-- AddForeignKey
ALTER TABLE [dbo].[CustomerInvoiceItem] ADD CONSTRAINT [CustomerInvoiceItem_visionTypeId_fkey] FOREIGN KEY ([visionTypeId]) REFERENCES [dbo].[VisionType]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
