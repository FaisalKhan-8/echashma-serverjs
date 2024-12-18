const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config');

const getStock = async (req, res, next) => {
  const { companyId } = req.user;
  const { productId, brandId, modalNo, frameTypeId, shapeTypeId } = req.body;

  // Check if all required fields are provided
  if (!productId || !brandId || !modalNo || !frameTypeId || !shapeTypeId) {
    return next(new AppError('All required fields must be provided', 400));
  }

  try {
    // Query the inventory table based on provided fields
    const inventory = await db.inventory.findFirst({
      where: {
        productId,
        brandId,
        modalNo,
        frameTypeId,
        shapeTypeId,
        companyId,
      },
      select: {
        stock: true, // Return only the stock field
      },
    });

    if (!inventory) {
      return next(
        new AppError('No matching inventory found for the given criteria', 404)
      );
    }

    res.json({ stock: inventory.stock });
  } catch (error) {
    console.error('Error fetching stock:', error);
    return next(new AppError('Error fetching stock', 500));
  }
};

module.exports = { getStock };
