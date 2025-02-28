const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config');

const getStock = async (req, res, next) => {
  const { companyId, branchId: userBranchId, role } = req.user;
  const { branchId: queryBranchId } = req.query;
  const { productId, brandId, modalNo, frameTypeId, shapeTypeId } = req.body;

  try {
    // Validate required fields
    if (!productId || !brandId || !frameTypeId || !shapeTypeId) {
      throw new AppError('All required fields must be provided', 400);
    }

    // Determine branch ID based on user role
    let branchId;
    if (role === 'MANAGER') {
      branchId = parseInt(userBranchId, 10);
    } else if (
      role === 'SUPER_ADMIN' ||
      role === 'ADMIN' ||
      role === 'SUBADMIN'
    ) {
      if (!queryBranchId) {
        throw new AppError('Branch ID is required', 400);
      }
      branchId = parseInt(queryBranchId, 10);
    } else {
      throw new AppError('Unauthorized role', 403);
    }

    if (!branchId || isNaN(branchId)) {
      throw new AppError('Invalid branch ID', 400);
    }

    // Build inventory query with branch ID
    const query = {
      productId,
      brandId,
      frameTypeId,
      shapeTypeId,
      companyId,
      branchId, // Include branch ID in query
    };

    if (modalNo) {
      query.modalNo = modalNo;
    }

    // Find inventory record with branch-specific stock
    const inventory = await db.inventory.findFirst({
      where: query,
      select: { stock: true },
    });

    if (!inventory) {
      return res.status(200).json({ stock: 0 }); // Return 0 instead of error if no record found
    }

    res.json({ stock: inventory.stock });
  } catch (error) {
    console.error('Error fetching stock:', error);
    next(error);
  }
};

const getProductDetails = async (req, res, next) => {
  const { companyId, branchId: userBranchId, role } = req.user;
  const { branchId: queryBranchId, productId } = req.query;

  try {
    // Validate required fields
    if (!productId) {
      throw new AppError('Product ID is required', 400);
    }

    // Determine branch ID based on user role
    let branchId;
    if (role === 'MANAGER') {
      branchId = parseInt(userBranchId, 10);
    } else if (['SUPER_ADMIN', 'ADMIN', 'SUBADMIN'].includes(role)) {
      if (!queryBranchId) {
        throw new AppError('Branch ID is required', 400);
      }
      branchId = parseInt(queryBranchId, 10);
    } else {
      throw new AppError('Unauthorized role', 403);
    }

    if (!branchId || isNaN(branchId)) {
      throw new AppError('Invalid branch ID', 400);
    }

    // Fetch product details along with related frame, shape, vision, and price
    const product = await db.product.findUnique({
      where: { id: parseInt(productId, 10) },
      include: {
        FrameType: true,
        ShapeType: true,
        VisionType: true,
        Inventory: {
          where: { branchId, companyId },
          select: { stock: true, price: true },
        },
      },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Extract necessary details
    const response = {
      productId: product.id,
      name: product.name,
      frameTypes: product.FrameType.map((frame) => ({
        id: frame.id,
        name: frame.name,
      })),
      shapeTypes: product.ShapeType.map((shape) => ({
        id: shape.id,
        name: shape.name,
      })),
      visionTypes: product.VisionType.map((vision) => ({
        id: vision.id,
        name: vision.name,
      })),
      stock: product.Inventory.length > 0 ? product.Inventory[0].stock : 0,
      price: product.Inventory.length > 0 ? product.Inventory[0].price : null,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching product details:', error);
    next(error);
  }
};

module.exports = { getStock, getProductDetails };
