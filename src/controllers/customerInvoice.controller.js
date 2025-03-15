const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config');

// const createCustomerInvoice = async (req, res, next) => {
//   const { companyId, branchId: userBranchId, role } = req.user;
//   const { branchId: queryBranchId } = req.query;

//   console.log(userBranchId, 'userBranchId');
//   console.log(req.user, 'req.user');

//   try {
//     // Step 1: Check if the request body is empty
//     if (!req.body || Object.keys(req.body).length === 0) {
//       throw new AppError('Request body is empty', 400);
//     }

//     console.log('body ===>', req.body);

//     // Step 2: Destructure the incoming data from the request
//     const {
//       products, // Each product now includes its own leftEye and rightEye details.
//       orderDate,
//       gstStatus,
//       ...invoiceData
//     } = req.body;

//     console.log('products ===>', products);

//     if (!products || !Array.isArray(products) || products.length === 0) {
//       throw new AppError('Products must be provided', 400);
//     }

//     const missingFields = products.some((product) => {
//       return (
//         !product.productId ||
//         !product.brandId ||
//         !product.frameTypeId ||
//         !product.shapeId
//       );
//     });

//     if (missingFields) {
//       throw new AppError('All required fields must be provided', 400);
//     }

//     if (!companyId) {
//       throw new AppError('User does not have an associated company', 400);
//     }

//     // Step 3: Assign branchId based on user role
//     let branchId;
//     if (role === 'MANAGER') {
//       branchId = parseInt(userBranchId, 10);
//     } else if (
//       role === 'SUPER_ADMIN' ||
//       role === 'ADMIN' ||
//       role === 'SUBADMIN'
//     ) {
//       if (!queryBranchId) {
//         return res.status(400).json({ message: 'Branch ID is required' });
//       }
//       branchId = parseInt(queryBranchId, 10) || undefined;
//     } else {
//       return res.status(403).json({ message: 'Unauthorized role' });
//     }

//     if (!branchId) {
//       return res.status(400).json({ message: 'Branch ID is required' });
//     }

//     // Step 4: Generate a unique invoice number
//     let invoiceNo;
//     let lastInvoice;
//     let existingInvoice;

//     do {
//       lastInvoice = await db.customerInvoice.findFirst({
//         orderBy: { createdAt: 'desc' },
//         select: { orderNo: true },
//       });

//       if (lastInvoice) {
//         const lastInvoiceNo = lastInvoice.orderNo; // e.g., "EC123"
//         const numericPart = lastInvoiceNo.replace('EC', '');
//         const numericValue = parseInt(numericPart, 10);
//         if (!isNaN(numericValue)) {
//           invoiceNo = `EC${numericValue + 1}`;
//         } else {
//           invoiceNo = 'EC1';
//         }
//       } else {
//         invoiceNo = 'EC1';
//       }

//       console.log('Generated invoiceNo:', invoiceNo);

//       existingInvoice = await db.customerInvoice.findUnique({
//         where: { orderNo: invoiceNo },
//       });
//     } while (existingInvoice);

//     // Step 5: Prepare items from products array and include prescription details
//     const items = products.map((item) => {
//       const {
//         productId,
//         quantity,
//         price,
//         discount = 0,
//         modalNo,
//         frameTypeId,
//         shapeId,
//         brandId,
//         leftEye, // Prescription for left eye per product
//         rightEye, // Prescription for right eye per product
//       } = item;

//       // Calculate amount before discount
//       const amountBeforeDiscount = price * quantity;
//       const discountAmount = (discount / 100) * amountBeforeDiscount;
//       const discountedAmount = amountBeforeDiscount - discountAmount;

//       let cgst = 0;
//       let sgst = 0;
//       let totalAmountPerItem = discountedAmount;

//       // Apply GST if enabled
//       if (gstStatus) {
//         const gstRate = 0.18;
//         const gstAmount = discountedAmount * gstRate;
//         cgst = gstAmount / 2;
//         sgst = gstAmount / 2;
//         totalAmountPerItem = discountedAmount + gstAmount;
//       }

//       // Round to 2 decimal places
//       cgst = Number(cgst.toFixed(2));
//       sgst = Number(sgst.toFixed(2));
//       totalAmountPerItem = Number(totalAmountPerItem.toFixed(2));

//       return {
//         productId,
//         quantity,
//         rate: price,
//         discount, // percentage discount
//         amount: totalAmountPerItem,
//         modalNo,
//         frameTypeId,
//         shapeTypeId: shapeId,
//         brandId,
//         cgst,
//         sgst,
//         leftEye, // Store prescription details
//         rightEye, // Store prescription details
//       };
//     });

//     // Calculate the total amount before overall discount
//     let totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
//     totalAmount = Number(totalAmount.toFixed(2));

//     const totalCGST = Number(
//       items.reduce((sum, item) => sum + item.cgst, 0).toFixed(2)
//     );
//     const totalSGST = Number(
//       items.reduce((sum, item) => sum + item.sgst, 0).toFixed(2)
//     );

//     // Apply overall discount (if provided)
//     const overallDiscountPercentage = invoiceData.discount || 0;
//     const overallDiscountAmount = Number(
//       (totalAmount * (overallDiscountPercentage / 100)).toFixed(2)
//     );
//     totalAmount = Math.max(totalAmount - overallDiscountAmount, 0);
//     totalAmount = Number(totalAmount.toFixed(2));

//     if (totalAmount < 0) {
//       throw new AppError('Total amount cannot be negative after discount', 400);
//     }

//     const advanceAmount = Number((Number(invoiceData.advance) || 0).toFixed(2));

//     let balanceAmount = totalAmount - advanceAmount;
//     balanceAmount = Number(balanceAmount.toFixed(2));

//     if (balanceAmount < 0) {
//       throw new AppError('Balance cannot be negative', 400);
//     }

//     // Step 6: Convert orderDate to Date object if it's not already
//     const formattedOrderDate = new Date(orderDate);
//     if (isNaN(formattedOrderDate.getTime())) {
//       throw new AppError('Invalid orderDate format', 400);
//     }

//     // Step 7: Create the invoice and decrement stock in a single transaction
//     const newInvoice = await db.$transaction(async (prisma) => {
//       // Decrement stock for each product
//       for (const product of products) {
//         const {
//           productId,
//           modalNo,
//           shapeId: shapeTypeId,
//           brandId,
//           frameTypeId,
//           quantity,
//         } = product;

//         const inventoryQuery = {
//           where: {
//             productId,
//             shapeTypeId,
//             brandId,
//             frameTypeId,
//             companyId,
//           },
//         };

//         const inventoryRecord = await prisma.inventory.findFirst(
//           inventoryQuery
//         );

//         console.log(inventoryRecord, '===inventoryRecord');

//         if (!inventoryRecord) {
//           return new AppError(
//             `Inventory record not found for productId: ${productId}`,
//             400
//           );
//         }

//         if (inventoryRecord.stock < quantity) {
//           return new AppError(
//             `Insufficient stock for productId: ${productId}. Available stock: ${inventoryRecord.stock}, requested: ${quantity}`,
//             400
//           );
//         }

//         await prisma.inventory.update({
//           where: { id: inventoryRecord.id },
//           data: {
//             stock: inventoryRecord.stock - quantity,
//           },
//         });

//         console.log(
//           `Stock decremented for productId: ${productId}, modalNo: ${modalNo}. New stock: ${
//             inventoryRecord.stock - quantity
//           }`
//         );
//       }

//       // Create the invoice and items
//       const invoice = await prisma.customerInvoice.create({
//         data: {
//           ...invoiceData,
//           orderNo: invoiceNo,
//           totalAmount,
//           totalCGST,
//           totalSGST,
//           totalGST: Number((totalCGST + totalSGST).toFixed(2)),
//           orderDate: formattedOrderDate,
//           companyId,
//           branchId,
//           advance: advanceAmount,
//           balance: balanceAmount,
//           items: {
//             create: items,
//           },
//         },
//       });

//       console.log(invoice, '===created invoice');
//       return invoice;
//     });

//     console.log(newInvoice, '===newInvoice');
//     return res.status(201).json(newInvoice);
//   } catch (error) {
//     console.error(error);
//     next(error);
//   }
// };

const createCustomerInvoice = async (req, res, next) => {
  const { companyId, branchId: userBranchId, role } = req.user;
  const { branchId: queryBranchId } = req.query;

  try {
    // Validate request body
    if (!req.body || Object.keys(req.body).length === 0) {
      throw new AppError('Request body is empty', 400);
    }

    // Destructure request data
    const { products, orderDate, gstStatus, ...invoiceData } = req.body;

    // Validate products array
    if (!products || !Array.isArray(products) || products.length === 0) {
      throw new AppError('Valid products array is required', 400);
    }

    // Check required product fields
    const missingProductFields = products.some(
      (product) =>
        !product.productId ||
        !product.brandId ||
        !product.frameTypeId ||
        !product.shapeId
    );
    if (missingProductFields) {
      throw new AppError('All product fields are required', 400);
    }

    // Validate company association
    if (!companyId) {
      throw new AppError('User company not found', 400);
    }

    // Determine branch ID based on role
    let branchId;
    if (role === 'MANAGER') {
      branchId = parseInt(userBranchId, 10);
    } else if (['SUPER_ADMIN', 'ADMIN', 'SUBADMIN'].includes(role)) {
      if (!queryBranchId) throw new AppError('Branch ID required', 400);
      branchId = parseInt(queryBranchId, 10);
    } else {
      throw new AppError('Unauthorized role', 403);
    }

    // Generate unique invoice number
    const generateInvoiceNo = async () => {
      const lastInvoice = await db.customerInvoice.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { orderNo: true },
      });

      const lastNumber = lastInvoice
        ? parseInt(lastInvoice.orderNo.replace('EC', '')) || 0
        : 0;
      return `EC${lastNumber + 1}`;
    };

    const invoiceNo = await generateInvoiceNo();

    // Calculate financials
    const processFinancials = () => {
      // Phase 1: Calculate item-level discounts
      const itemsWithDiscounts = products.map((item) => {
        const amountBeforeDiscount = item.price * item.quantity;
        const itemDiscount =
          ((item.discount || 0) / 100) * amountBeforeDiscount;
        return {
          ...item,
          netAmount: amountBeforeDiscount - itemDiscount,
        };
      });

      // Calculate subtotal before overall discount
      const subtotalBeforeOverall = itemsWithDiscounts.reduce(
        (sum, item) => sum + item.netAmount,
        0
      );

      // Apply overall discount
      const overallDiscount =
        ((invoiceData.discount || 0) / 100) * subtotalBeforeOverall;
      const subtotalAfterDiscount = subtotalBeforeOverall - overallDiscount;

      // Phase 2: Calculate GST and final amounts
      return itemsWithDiscounts.map((item) => {
        // Calculate proportional discount
        const itemProportion = item.netAmount / subtotalBeforeOverall || 0;
        const itemShareOfDiscount = overallDiscount * itemProportion;

        // Calculate taxable amount after all discounts
        const taxableAmount = item.netAmount - itemShareOfDiscount;

        // Calculate GST if applicable
        let cgst = 0;
        let sgst = 0;
        let finalAmount = taxableAmount;

        if (gstStatus) {
          const gstAmount = taxableAmount * 0.18;
          cgst = gstAmount / 2;
          sgst = gstAmount / 2;
          finalAmount += gstAmount;
        }

        return {
          productId: item.productId,
          quantity: item.quantity,
          rate: item.price,
          discount: item.discount || 0,
          amount: Number(finalAmount.toFixed(2)),
          cgst: Number(cgst.toFixed(2)),
          sgst: Number(sgst.toFixed(2)),
          modalNo: item.modalNo,
          frameTypeId: item.frameTypeId,
          shapeTypeId: item.shapeId,
          brandId: item.brandId,
          leftEye: item.leftEye,
          rightEye: item.rightEye,
        };
      });
    };

    // Process item calculations
    const items = processFinancials();

    // Calculate totals
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
    const totalCGST = items.reduce((sum, item) => sum + item.cgst, 0);
    const totalSGST = items.reduce((sum, item) => sum + item.sgst, 0);
    const balanceAmount = totalAmount - (invoiceData.advance || 0);

    // Validate dates
    const orderDateObj = new Date(orderDate);
    if (isNaN(orderDateObj)) throw new AppError('Invalid order date', 400);

    // Database transaction
    const newInvoice = await db.$transaction(async (prisma) => {
      // Inventory updates
      for (const product of products) {
        const inventory = await prisma.inventory.findFirst({
          where: {
            productId: product.productId,
            shapeTypeId: product.shapeId,
            brandId: product.brandId,
            frameTypeId: product.frameTypeId,
            companyId,
            branchId,
          },
        });

        if (!inventory) {
          throw new AppError(
            `Inventory not found for product ${product.productId}`,
            400
          );
        }

        if (inventory.stock < product.quantity) {
          throw new AppError(
            `Insufficient stock for product ${product.productId} (${inventory.stock} available)`,
            400
          );
        }

        await prisma.inventory.update({
          where: { id: inventory.id },
          data: { stock: inventory.stock - product.quantity },
        });
      }

      // Create invoice
      return await prisma.customerInvoice.create({
        data: {
          ...invoiceData,
          orderNo: invoiceNo,
          orderDate: orderDateObj,
          totalAmount: Number(totalAmount.toFixed(2)),
          totalCGST: Number(totalCGST.toFixed(2)),
          totalSGST: Number(totalSGST.toFixed(2)),
          totalGST: Number((totalCGST + totalSGST).toFixed(2)),
          companyId,
          branchId,
          advance: Number((invoiceData.advance || 0).toFixed(2)),
          balance: Number(balanceAmount.toFixed(2)),
          items: { create: items },
        },
        include: { items: true },
      });
    });

    return res.status(201).json(newInvoice);
  } catch (error) {
    next(error);
  }
};

async function getAllCustomerInvoices(req, res, next) {
  try {
    // Get companyId, branchId from the token and role from the authenticated user
    const { companyId, branchId: userBranchId, role } = req.user;
    const { branchId: queryBranchId } = req.query;

    console.log('Role:', role);
    console.log(queryBranchId, 'queryBranchId');

    let branchId;
    let companyFilter = {};

    // Determine the branchId based on role
    if (role === 'SUPER_ADMIN') {
      // For SUPER_ADMIN, use branchId from query if provided
      branchId = queryBranchId ? parseInt(queryBranchId, 10) : undefined;
      if (isNaN(branchId) && queryBranchId) {
        return next(new AppError('Invalid branchId provided', 400));
      }
    } else if (role === 'SUBADMIN' || role === 'ADMIN') {
      // For SUBADMIN and ADMIN, use branchId from query if provided,
      // and ensure companyId is available
      branchId = queryBranchId ? parseInt(queryBranchId, 10) : undefined;
      if (isNaN(branchId) && queryBranchId) {
        return next(new AppError('Invalid branchId provided', 400));
      }
      if (!companyId) {
        return next(
          new AppError('Company ID is required to fetch invoices', 400)
        );
      }
      companyFilter = { companyId }; // Restrict to the user's company
    } else if (role === 'MANAGER') {
      // For MANAGER, always use branchId from token
      branchId = userBranchId ? parseInt(userBranchId, 10) : undefined;
      if (isNaN(branchId) && userBranchId) {
        return next(new AppError('Invalid branchId provided', 400));
      }
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
    console.log('Branch ID:', branchId);

    // Fetch invoices with pagination and optional search
    const invoices = await db.customerInvoice.findMany({
      where: {
        ...companyFilter, // Apply the role-based company filter
        ...(branchId && { branchId }), // Apply branchId if available
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
      include: {
        items: {
          include: {
            product: true, // Include related product details
            brands: true,
            frameType: true, // Include related frameType details
            shapeType: true, // Include related shapeType details
          },
        },
      },
      skip, // Offset for pagination
      take: limit, // Limit the number of invoices returned
      orderBy: {
        createdAt: 'desc', // Order by creation date (most recent first)
      },
    });

    // Fetch total count of invoices for pagination
    const totalInvoices = await db.customerInvoice.count({
      where: {
        ...companyFilter, // Apply the same company filter for counting
        ...(branchId && { branchId }), // Apply branchId if available
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
    if (role === 'SUPER_ADMIN') {
      const invoice = await db.customerInvoice.findUnique({
        where: {
          id: parseInt(id), // Assuming `id` is an integer
        },
        include: {
          items: {
            include: {
              product: true, // Include related product details
              brands: true,
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
    const invoice = await db.customerInvoice.findFirst({
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
