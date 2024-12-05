const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config');

async function createPrescription(req, res) {
  try {
    const {
      rightSPH,
      rightCYL,
      rightAXIS,
      rightADD,
      leftSPH,
      leftCYL,
      leftAXIS,
      leftADD,
      lensType,
      orderNo,
      orderDate,
      customerInvoiceId,
    } = req.body;

    const newPrescription = await db.prescription.create({
      data: {
        rightSPH,
        rightCYL,
        rightAXIS,
        rightADD,
        leftSPH,
        leftCYL,
        leftAXIS,
        leftADD,
        lensType,
        orderNo,
        orderDate: new Date(orderDate),
        customerInvoiceId,
      },
    });

    res.status(201).json(newPrescription);
  } catch (error) {
    next(new AppError(error.message, 500));
  }
}

module.exports = { createPrescription };
