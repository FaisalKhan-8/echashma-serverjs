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
    } = req.body;

    // Validate required fields if needed
    if (!invoiceDate || !invoiceNo || !customerName || !customerPhone) {
      return next(new AppError('Missing required fields', 400)); // Return bad request error
    }

    // Create the invoice in the database
    const newInvoice = await db.customerInvoice.create({
      data: {
        invoiceDate: new Date(invoiceDate),
        invoiceNo,
        customerName,
        customerPhone,
        DOB,
        DOM,
        address,
        email,
        LRC,
      },
    });

    // Send the created invoice in the response
    return res.status(201).json({
      status: 'success',
      message: 'Invoice created successfully',
      invoice: newInvoice,
    });
  } catch (error) {
    // Pass the error to the next middleware (error handler)
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
