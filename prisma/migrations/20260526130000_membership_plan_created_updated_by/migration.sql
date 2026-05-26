BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[MembershipPlan] ADD [createdBy] INT NULL;
ALTER TABLE [dbo].[MembershipPlan] ADD [updatedBy] INT NULL;

ALTER TABLE [dbo].[MembershipPlan] ADD CONSTRAINT [MembershipPlan_createdBy_fkey] FOREIGN KEY ([createdBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[MembershipPlan] ADD CONSTRAINT [MembershipPlan_updatedBy_fkey] FOREIGN KEY ([updatedBy]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
