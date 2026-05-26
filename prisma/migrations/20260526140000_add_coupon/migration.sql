BEGIN TRY

BEGIN TRAN;

CREATE TABLE [dbo].[Coupon] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] VARCHAR(50) NOT NULL,
    [description] NVARCHAR(200) NOT NULL,
    [discountType] VARCHAR(20) NOT NULL,
    [discountValue] DECIMAL(10,2) NOT NULL,
    [expiryDate] DATETIME2 NULL,
    [usageLimit] INT NULL,
    [usedCount] INT NOT NULL CONSTRAINT [Coupon_usedCount_df] DEFAULT 0,
    [usageLimitPerCompany] INT NULL,
    [minPurchaseAmount] DECIMAL(10,2) NULL,
    [maxDiscountAmount] DECIMAL(10,2) NULL,
    [applicableBillingPeriods] NVARCHAR(max) NULL,
    [isPublic] BIT NOT NULL CONSTRAINT [Coupon_isPublic_df] DEFAULT 0,
    [status] VARCHAR(20) NOT NULL CONSTRAINT [Coupon_status_df] DEFAULT 'ACTIVE',
    [created_at] DATETIME2 NOT NULL CONSTRAINT [Coupon_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [Coupon_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Coupon_code_key] UNIQUE NONCLUSTERED ([code])
);

CREATE TABLE [dbo].[CouponCompanyUsage] (
    [id] INT NOT NULL IDENTITY(1,1),
    [couponId] INT NOT NULL,
    [companyId] INT NOT NULL,
    [count] INT NOT NULL CONSTRAINT [CouponCompanyUsage_count_df] DEFAULT 0,
    CONSTRAINT [CouponCompanyUsage_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [CouponCompanyUsage_couponId_companyId_key] UNIQUE NONCLUSTERED ([couponId],[companyId])
);

CREATE TABLE [dbo].[CouponMembershipPlan] (
    [couponId] INT NOT NULL,
    [membershipPlanId] INT NOT NULL,
    CONSTRAINT [CouponMembershipPlan_pkey] PRIMARY KEY CLUSTERED ([couponId],[membershipPlanId])
);

ALTER TABLE [dbo].[CouponCompanyUsage] ADD CONSTRAINT [CouponCompanyUsage_couponId_fkey] FOREIGN KEY ([couponId]) REFERENCES [dbo].[Coupon]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE [dbo].[CouponCompanyUsage] ADD CONSTRAINT [CouponCompanyUsage_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[CouponMembershipPlan] ADD CONSTRAINT [CouponMembershipPlan_couponId_fkey] FOREIGN KEY ([couponId]) REFERENCES [dbo].[Coupon]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE [dbo].[CouponMembershipPlan] ADD CONSTRAINT [CouponMembershipPlan_membershipPlanId_fkey] FOREIGN KEY ([membershipPlanId]) REFERENCES [dbo].[MembershipPlan]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE NONCLUSTERED INDEX [Coupon_code_status_idx] ON [dbo].[Coupon]([code], [status]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
