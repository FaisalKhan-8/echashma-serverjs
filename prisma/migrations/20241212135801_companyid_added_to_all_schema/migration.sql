-- AlterTable
ALTER TABLE "Brands" ADD COLUMN     "companyId" INTEGER;

-- AlterTable
ALTER TABLE "CoatingType" ADD COLUMN     "companyId" INTEGER;

-- AlterTable
ALTER TABLE "CustomerInvoice" ADD COLUMN     "companyId" INTEGER;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "companyId" INTEGER;

-- AlterTable
ALTER TABLE "ExpenseCategory" ADD COLUMN     "companyId" INTEGER;

-- AlterTable
ALTER TABLE "FrameType" ADD COLUMN     "companyId" INTEGER;

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "companyId" INTEGER;

-- AlterTable
ALTER TABLE "ShapeType" ADD COLUMN     "companyId" INTEGER;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "companyId" INTEGER;

-- AlterTable
ALTER TABLE "VisionType" ADD COLUMN     "companyId" INTEGER;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameType" ADD CONSTRAINT "FrameType_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShapeType" ADD CONSTRAINT "ShapeType_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisionType" ADD CONSTRAINT "VisionType_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoatingType" ADD CONSTRAINT "CoatingType_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brands" ADD CONSTRAINT "Brands_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerInvoice" ADD CONSTRAINT "CustomerInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
