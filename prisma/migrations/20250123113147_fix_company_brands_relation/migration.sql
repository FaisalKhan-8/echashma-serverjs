-- AlterTable
ALTER TABLE "_ProductToSupplier" ADD CONSTRAINT "_ProductToSupplier_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_ProductToSupplier_AB_unique";

-- AlterTable
ALTER TABLE "_UserBranches" ADD CONSTRAINT "_UserBranches_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_UserBranches_AB_unique";
