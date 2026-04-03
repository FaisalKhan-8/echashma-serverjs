/*
  Prisma runs this file as one batch — SQL Server cannot see new columns in the same
  compile phase as ALTER ADD. Use EXEC so the UPDATE is compiled after columns exist.
  (GO is not supported by the Prisma SQL Server driver.)
*/

BEGIN TRY
BEGIN TRAN;

IF COL_LENGTH('dbo.Company', 'membershipStartDate') IS NULL
  ALTER TABLE [dbo].[Company] ADD [membershipStartDate] DATETIME2 NULL;
IF COL_LENGTH('dbo.Company', 'membershipEndDate') IS NULL
  ALTER TABLE [dbo].[Company] ADD [membershipEndDate] DATETIME2 NULL;

EXEC(N'UPDATE [dbo].[Company] SET [membershipStartDate] = [created_at], [membershipEndDate] = DATEADD(day, 15, [created_at]) WHERE [membershipStartDate] IS NULL');

ALTER TABLE [dbo].[Company] ALTER COLUMN [membershipStartDate] DATETIME2 NOT NULL;
ALTER TABLE [dbo].[Company] ALTER COLUMN [membershipEndDate] DATETIME2 NOT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = N'Company_membershipStartDate_df' AND parent_object_id = OBJECT_ID(N'dbo.Company'))
  ALTER TABLE [dbo].[Company] ADD CONSTRAINT [Company_membershipStartDate_df] DEFAULT SYSUTCDATETIME() FOR [membershipStartDate];
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = N'Company_membershipEndDate_df' AND parent_object_id = OBJECT_ID(N'dbo.Company'))
  ALTER TABLE [dbo].[Company] ADD CONSTRAINT [Company_membershipEndDate_df] DEFAULT (DATEADD(day, 15, SYSUTCDATETIME())) FOR [membershipEndDate];

COMMIT TRAN;
END TRY
BEGIN CATCH
IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW
END CATCH
