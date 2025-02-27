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

module.exports = { getStock };
