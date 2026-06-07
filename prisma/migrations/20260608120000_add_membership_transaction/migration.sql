-- Add company membership plan fields
ALTER TABLE [dbo].[Company] ADD [membershipPlanId] INT NULL;
ALTER TABLE [dbo].[Company] ADD [membershipName] NVARCHAR(100) NULL;
ALTER TABLE [dbo].[Company] ADD [billingAddressJson] NVARCHAR(max) NULL;

ALTER TABLE [dbo].[Company] ADD CONSTRAINT [Company_membershipPlanId_fkey]
  FOREIGN KEY ([membershipPlanId]) REFERENCES [dbo].[MembershipPlan]([id])
  ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Membership transactions (Cashfree checkout)
CREATE TABLE [dbo].[MembershipTransaction] (
  [id] INT NOT NULL IDENTITY(1,1),
  [uuid] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [MembershipTransaction_uuid_df] DEFAULT NEWID(),
  [membershipPlanId] INT NOT NULL,
  [companyId] INT NOT NULL,
  [billingPeriod] NVARCHAR(20) NOT NULL,
  [billingAddressJson] NVARCHAR(max) NOT NULL,
  [billingAddressSameAsCompany] BIT NOT NULL CONSTRAINT [MembershipTransaction_billingAddressSameAsCompany_df] DEFAULT 0,
  [paymentGateway] NVARCHAR(20) NOT NULL,
  [paymentMethod] NVARCHAR(20) NOT NULL,
  [priceBreakdownJson] NVARCHAR(max) NOT NULL,
  [couponCode] NVARCHAR(50) NULL,
  [successUrl] NVARCHAR(500) NULL,
  [failureUrl] NVARCHAR(500) NULL,
  [transactionStatus] NVARCHAR(20) NOT NULL CONSTRAINT [MembershipTransaction_transactionStatus_df] DEFAULT 'PENDING',
  [cashfreeOrderId] NVARCHAR(45) NULL,
  [cashfreeCfOrderId] NVARCHAR(100) NULL,
  [cashfreePaymentSessionId] NVARCHAR(500) NULL,
  [cashfreePaymentId] NVARCHAR(100) NULL,
  [cashfreeResponseJson] NVARCHAR(max) NULL,
  [failureReason] NVARCHAR(500) NULL,
  [subscriptionStartDate] DATETIME2 NULL,
  [subscriptionEndDate] DATETIME2 NULL,
  [nextBillingDate] DATETIME2 NULL,
  [invoicePdfUrl] NVARCHAR(512) NULL,
  [created_at] DATETIME2 NOT NULL CONSTRAINT [MembershipTransaction_created_at_df] DEFAULT CURRENT_TIMESTAMP,
  [updated_at] DATETIME2 NOT NULL CONSTRAINT [MembershipTransaction_updated_at_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [MembershipTransaction_pkey] PRIMARY KEY ([id]),
  CONSTRAINT [MembershipTransaction_uuid_key] UNIQUE ([uuid])
);

ALTER TABLE [dbo].[MembershipTransaction] ADD CONSTRAINT [MembershipTransaction_membershipPlanId_fkey]
  FOREIGN KEY ([membershipPlanId]) REFERENCES [dbo].[MembershipPlan]([id])
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[MembershipTransaction] ADD CONSTRAINT [MembershipTransaction_companyId_fkey]
  FOREIGN KEY ([companyId]) REFERENCES [dbo].[Company]([id])
  ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE NONCLUSTERED INDEX [MembershipTransaction_companyId_created_at_idx]
  ON [dbo].[MembershipTransaction]([companyId], [created_at] DESC);

CREATE NONCLUSTERED INDEX [MembershipTransaction_cashfreeOrderId_idx]
  ON [dbo].[MembershipTransaction]([cashfreeOrderId]);

CREATE NONCLUSTERED INDEX [MembershipTransaction_transactionStatus_idx]
  ON [dbo].[MembershipTransaction]([transactionStatus]);
