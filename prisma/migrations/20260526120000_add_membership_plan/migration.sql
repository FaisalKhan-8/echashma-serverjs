BEGIN TRY

BEGIN TRAN;

CREATE TABLE [dbo].[MembershipPlan] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(100) NOT NULL,
    [description] NVARCHAR(500) NULL,
    [order] INT NOT NULL CONSTRAINT [MembershipPlan_order_df] DEFAULT 0,
    [monthlyPrice] DECIMAL(10,2) NOT NULL,
    [monthlyOldAmount] DECIMAL(10,2) NULL,
    [threeMonthPrice] DECIMAL(10,2) NULL,
    [threeMonthOldAmount] DECIMAL(10,2) NULL,
    [sixMonthPrice] DECIMAL(10,2) NULL,
    [sixMonthOldAmount] DECIMAL(10,2) NULL,
    [annualPrice] DECIMAL(10,2) NULL,
    [annualOldAmount] DECIMAL(10,2) NULL,
    [gstPercentage] DECIMAL(5,2) NOT NULL CONSTRAINT [MembershipPlan_gstPercentage_df] DEFAULT 18,
    [maxStudents] INT NULL,
    [isPopular] BIT NOT NULL CONSTRAINT [MembershipPlan_isPopular_df] DEFAULT 0,
    [features] NVARCHAR(max) NOT NULL CONSTRAINT [MembershipPlan_features_df] DEFAULT N'[]',
    [status] VARCHAR(50) NOT NULL CONSTRAINT [MembershipPlan_status_df] DEFAULT 'ACTIVE',
    [created_at] DATETIME2 NOT NULL CONSTRAINT [MembershipPlan_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [MembershipPlan_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [MembershipPlan_name_key] UNIQUE NONCLUSTERED ([name])
);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
