const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config'); // Assuming you have a DB config

const createCustomerInvoice = async (req, res) => {
  try {
    // Step 1: Check if the request body is empty
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: 'Request body is empty' });
    }

    console.log('body ===>', req.body);

    // Step 2: Destructure the incoming data from the request
    const { products, rightEye, leftEye, orderNo, orderDate, ...invoiceData } =
      req.body;

    console.log('products ===>', products);

    // Check if 'products' is present and is an array
    if (!Array.isArray(products) || products.length === 0) {
      return res
        .status(400)
        .json({ message: 'Products array is missing or empty' });
    }

    // Step 3: Check if the 'orderNo' already exists (unique validation)
    const existingInvoice = await db.customerInvoice.findUnique({
      where: { orderNo },
    });

    if (existingInvoice) {
      return res
        .status(400)
        .json({ message: 'Invoice with this order number already exists' });
    }

    // Step 4: Automatically assign 'companyId' from the authenticated user
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res
        .status(400)
        .json({ message: 'User does not have an associated company' });
    }

    // Step 5: Prepare items from products array and validate stock
    const items = products.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      rate: item.price,
      amount: item.amount,
      modalNo: item.modalNo,
      frameTypeId: item.frameTypeId,
      shapeTypeId: item.shapeId,
      brandId: item.brandId,
    }));

    // Calculate the total amount for the invoice
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    // Step 6: Convert orderDate to Date object if it's not already
    const formattedOrderDate = new Date(orderDate);

    // Check if the orderDate is a valid Date
    if (isNaN(formattedOrderDate.getTime())) {
      return res.status(400).json({ message: 'Invalid orderDate format' });
    }

    // Step 7: Create the invoice and decrement stock in a single transaction
    const newInvoice = await db.$transaction(async (prisma) => {
      // Decrement stock for each product
      for (const product of products) {
        const {
          productId,
          modalNo,
          shapeId: shapeTypeId,
          brandId,
          frameTypeId,
          quantity,
        } = product;

        // Fetch inventory record
        const inventoryRecord = await prisma.inventory.findFirst({
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
          return new AppError(
            `Inventory record not found for productId: ${productId}, modalNo: ${modalNo}`
          );
        }

        // Check if stock is sufficient
        if (inventoryRecord.stock < quantity) {
          return new AppError(
            `Insufficient stock for productId: ${productId}, modalNo: ${modalNo}. Available stock: ${inventoryRecord.stock}, requested: ${quantity}`
          );
        }

        // Decrement stock
        await prisma.inventory.update({
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
      }

      // Create the invoice and items
      const invoice = await prisma.customerInvoice.create({
        data: {
          ...invoiceData,
          orderNo,
          totalAmount,
          rightEye,
          leftEye,
          orderDate: formattedOrderDate,
          companyId,
          items: {
            create: items,
          },
        },
      });

      return invoice;
    });

    // Return the newly created invoice
    return res.status(201).json(newInvoice);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: 'Error creating invoice', error: error.message });
  }
};

async function getAllCustomerInvoices(req, res, next) {
  try {
    // Get companyId and role from the authenticated user
    const { companyId, role } = req.user;

    console.log('Role:', role);

    // Determine the company filter based on the role
    let companyFilter = {};

    if (role === 'ADMIN') {
      // Admin can view all invoices, no companyId filter needed
      companyFilter = {};
    } else if (role === 'SUBADMIN' || role === 'MANAGER') {
      // Subadmin and Manager need a companyId to filter data
      if (!companyId) {
        return next(
          new AppError('Company ID is required to fetch invoices', 400)
        );
      }
      companyFilter = { companyId }; // Restrict to the user's company
    } else {
      // Unauthorized role
      return next(
        new AppError('You do not have permission to view invoices', 403)
      );
    }

    // Get the page, limit, and search term from query parameters
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const searchTerm = req.query.search || ''; // Search term (can be empty)

    // Calculate the offset for pagination
    const skip = (page - 1) * limit;

    console.log('Company Filter:', companyFilter);

    // Fetch invoices with pagination and optional search
    const invoices = await db.customerInvoice.findMany({
      where: {
        ...companyFilter, // Apply the role-based company filter
        OR: [
          {
            orderNo: {
              contains: searchTerm, // Case-insensitive search by orderNo
              mode: 'insensitive',
            },
          },
          {
            customerName: {
              contains: searchTerm, // Case-insensitive search by customerName
              mode: 'insensitive',
            },
          },
        ],
      },
      skip: skip, // Offset for pagination
      take: limit, // Limit the number of invoices returned
      orderBy: {
        createdAt: 'desc', // Order by creation date (most recent first)
      },
    });

    // Fetch total count of invoices for pagination
    const totalInvoices = await db.customerInvoice.count({
      where: {
        ...companyFilter, // Apply the same company filter for counting
        OR: [
          {
            orderNo: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            customerName: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        ],
      },
    });

    // Check if invoices exist
    if (invoices.length === 0) {
      return next(new AppError('No invoices found', 404));
    }

    // Calculate total pages
    const totalPages = Math.ceil(totalInvoices / limit);

    // Respond with invoices and pagination data
    return res.status(200).json({
      status: 'success',
      data: invoices,
      pagination: {
        totalInvoices, // Total number of invoices
        totalPages, // Total pages available
        currentPage: page, // Current page number
        limit, // Number of invoices per page
      },
    });
  } catch (error) {
    // Log the error for debugging purposes
    console.error('Error Fetching Invoices:', error);

    // Ensure error passed to the next handler is an AppError
    return next(
      error instanceof AppError
        ? error
        : new AppError('Internal Server Error', 500)
    );
  }
}

// Function to get a customer invoice by ID for the authenticated user's company
const getCustomerInvoiceById = async (req, res, next) => {
  try {
    const { role, companyId } = req.user; // Assumes `req.user` contains the authenticated user's info
    const { id } = req.params; // Invoice ID from the URL

    console.log('User info:', req.user);
    console.log('Invoice ID:', id);

    // Admins can view any invoice
    if (role === 'ADMIN') {
      const invoice = await db.customerInvoice.findUnique({
        where: {
          id: parseInt(id), // Assuming `id` is an integer
        },
        include: {
          items: {
            include: {
              product: true, // Include related product details
              brands: true, // Corrected to 'brands', assuming that's the correct relation name
              frameType: true, // Include related frameType details
              shapeType: true, // Include related shapeType details
            },
          },
        },
      });

      if (!invoice) {
        return res.status(404).json({
          error: 'Invoice not found.',
        });
      }

      return res.status(200).json({
        message: 'Admin: Invoice retrieved successfully!',
        data: invoice,
      });
    }

    // SUBADMIN and MANAGER must have companyId to view an invoice
    if (!companyId) {
      return res.status(400).json({
        error: 'Company ID is required to fetch the invoice.',
      });
    }

    // For SUBADMIN and MANAGER: check if the invoice belongs to their company
    const invoice = await db.customerInvoice.findUnique({
      where: {
        id: parseInt(id),
        companyId: companyId, // Invoice must belong to the user's company
      },
      include: {
        items: {
          include: {
            product: true, // Include related product details
            brands: true, // Corrected to 'brands'
            frameType: true, // Include related frameType details
            shapeType: true, // Include related shapeType details
          },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({
        error: 'Invoice not found or does not belong to your company.',
      });
    }

    return res.status(200).json({
      message: `${role}: Invoice retrieved successfully!`,
      data: invoice,
    });
  } catch (error) {
    console.error('Error in getCustomerInvoiceById:', error);
    next(error);
  }
};

module.exports = {
  createCustomerInvoice,
  getAllCustomerInvoices,
  getCustomerInvoiceById,
};
