const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config');

const getStock = async (req, res, next) => {
  console.error('From inventory');

  const { companyId } = req.user;
  const { productId, brandId, modalNo, frameTypeId, shapeTypeId } = req.body;

  console.log(req.body, 'From inventory');

  console.log(req.body);
  // Check if the required fields (excluding modalNo) are provided
  if (!productId || !brandId || !frameTypeId || !shapeTypeId) {
    return next(
      new AppError('All required fields must be provided 11111', 400)
    );
  }

  try {
    // Construct the query object, include modalNo only if it's provided
    const query = {
      productId,
      brandId,
      frameTypeId,
      shapeTypeId,
      companyId,
    };

    if (modalNo) {
      query.modalNo = modalNo;
    }

    // Query the inventory table based on the provided fields
    const inventory = await db.inventory.findFirst({
      where: query,
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
