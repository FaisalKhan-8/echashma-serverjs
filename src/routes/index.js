const { Router } = require('express');
const authRoutes = require('./auth.routes');
const companyRoutes = require('./companies.routes');
const branchRoutes = require('./branch.routes');
const ProductRoutes = require('./product.routes');
const supplierRoutes = require('./supplier.routes');
const frameTypeRoutes = require('./frameType.routes');
const shapeTypeRoutes = require('./shapeType.routes');
const visionTypeRoutes = require('./visionType.routes');
const coatingTypeRoutes = require('./coatingType.routes');
const expensesRoutes = require('./expenses.routes');
const PurchaseRoutes = require('./purchase.routes');
const expenseCategoryRoutes = require('./expensesCategory.routes');
const customerInvoiceRoutes = require('./customerInvoice.routes');
const prescriptionRoutes = require('./prescription.routes');
const BrandRoutes = require('./brand.routes');
const InventoryRoutes = require('./inventory.routes');

const rootRouter = Router();

rootRouter.use('/auth', authRoutes);
rootRouter.use('/company', companyRoutes);
rootRouter.use('/branch', branchRoutes);
rootRouter.use('/product', ProductRoutes);
rootRouter.use('/supplier', supplierRoutes);
rootRouter.use('/frame', frameTypeRoutes);
rootRouter.use('/shape', shapeTypeRoutes);
rootRouter.use('/vision', visionTypeRoutes);
rootRouter.use('/coating', coatingTypeRoutes);
rootRouter.use('/purchase', PurchaseRoutes);
rootRouter.use('/expences', expensesRoutes);
rootRouter.use('/expence-category', expenseCategoryRoutes);
rootRouter.use('/customer-invoice', customerInvoiceRoutes);
rootRouter.use('/prescriptions', prescriptionRoutes);
rootRouter.use('/brand', BrandRoutes);
rootRouter.use('/inventory', InventoryRoutes);

module.exports = rootRouter;
