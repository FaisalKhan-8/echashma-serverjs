BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[Company] ADD [emailVerified] BIT NOT NULL CONSTRAINT [Company_emailVerified_df] DEFAULT 0;
ALTER TABLE [dbo].[Company] ADD [phoneVerified] BIT NOT NULL CONSTRAINT [Company_phoneVerified_df] DEFAULT 0;
ALTER TABLE [dbo].[Company] ADD [emailOtp] VARCHAR(255);
ALTER TABLE [dbo].[Company] ADD [emailOtpExpires] DATETIME2;
ALTER TABLE [dbo].[Company] ADD [phoneOtp] VARCHAR(255);
ALTER TABLE [dbo].[Company] ADD [phoneOtpExpires] DATETIME2;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
