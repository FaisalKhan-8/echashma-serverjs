-- AlterTable
ALTER TABLE "Company" ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "pancard" DROP NOT NULL,
ALTER COLUMN "aadhaarcard" DROP NOT NULL;