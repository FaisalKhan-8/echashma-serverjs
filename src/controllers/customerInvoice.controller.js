const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config'); // Assuming you have a DB config

async function createCustomerInvoice(req, res, next) {
  try {
    const {
      invoiceDate,
      invoiceNo,
      customerName,
      customerPhone,
      DOB,
      DOM,
      address,
      email,
      LRC,
      orderNo,
      lensType,
      rightSPH,
      leftSPH,
      rightCYL,
      leftCYL,
      rightAXIS,
      leftAXIS,
      rightADD,
      leftADD,
      productId,
      frameTypeId,
      brandId,
      shapeId,
      rate,
      quantity,
      discount,
      amount,
      totalAmount,
    } = req.body;

    // Validate required fields
    if (
      !invoiceDate ||
      !invoiceNo ||
      !customerName ||
      !customerPhone ||
      !productId ||
      !frameTypeId ||
      !brandId ||
      !shapeId ||
      !rate ||
      !quantity ||
      !amount ||
      !totalAmount
    ) {
      return next(new AppError('Missing required fields', 400));
    }

    // Create a new invoice
    const newInvoice = await db.customerInvoice.create({
      data: {
        invoiceDate: new Date(invoiceDate),
        invoiceNo,
        customerName,
        customerPhone,
        DOB: DOB ? new Date(DOB) : null,
        DOM: DOM ? new Date(DOM) : null,
        address,
        email,
        LRC,
        orderNo,
        lensType,
        rightSPH,
        leftSPH,
        rightCYL,
        leftCYL,
        rightAXIS,
        leftAXIS,
        rightADD,
        leftADD,
        productId,
        frameTypeId,
        brandId,
        shapeId,
        rate,
        quantity,
        discount: discount || 0, // Default to 0 if not provided
        amount,
        totalAmount,
      },
    });

    // Send the created invoice as a response
    return res.status(201).json({
      status: 'success',
      message: 'Customer invoice created successfully',
      invoice: newInvoice,
    });
  } catch (error) {
    // Handle errors gracefully
    return next(new AppError(error.message, 500));
  }
}

// Get all invoices
async function getAllCustomerInvoices(req, res, next) {
  try {
    const invoices = await db.customerInvoice.findMany();

    // Check if invoices exist
    if (invoices.length === 0) {
      return next(new AppError('No invoices found', 404));
    }

    return res.status(200).json({
      status: 'success',
      data: invoices,
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
}

// Get invoice by ID
async function getCustomerInvoiceById(req, res, next) {
  try {
    const { id } = req.params;

    // Find invoice by ID
    const invoice = await db.customerInvoice.findUnique({
      where: { id: parseInt(id) }, // Assuming `id` is an integer
    });

    // Check if the invoice exists
    if (!invoice) {
      return next(new AppError('Invoice not found', 404));
    }

    return res.status(200).json({
      status: 'success',
      data: invoice,
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
}

module.exports = {
  createCustomerInvoice,
  getAllCustomerInvoices,
  getCustomerInvoiceById,
};
