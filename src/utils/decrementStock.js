const { AppError } = require('../errors/AppError');

exports.decrementStock = async (product) => {
  const {
    productId,
    modalNo,
    shapeTypeId,
    brandId,
    frameTypeId,
    companyId,
    quantity,
  } = product;

  // Fetch inventory record based on unique product fields
  const inventoryRecord = await db.inventory.findFirst({
    where: {
      productId,
      modalNo,
      shapeTypeId,
      brandId,
      frameTypeId,
      companyId,
    },
  });

  if (!inventoryRecord) {
    throw new AppError(
      `Inventory record not found for productId: ${productId}, modalNo: ${modalNo}`
    );
  }

  // Check if stock is sufficient
  if (inventoryRecord.stock < quantity) {
    throw new AppError(
      `Insufficient stock for productId: ${productId}, modalNo: ${modalNo}. Available stock: ${inventoryRecord.stock}, requested: ${quantity}`
    );
  }

  // Decrement stock
  await db.inventory.update({
    where: { id: inventoryRecord.id },
    data: {
      stock: inventoryRecord.stock - quantity,
    },
  });

  console.log(
    `Stock decremented for productId: ${productId}, modalNo: ${modalNo}. New stock: ${
      inventoryRecord.stock - quantity
    }`
  );
};
