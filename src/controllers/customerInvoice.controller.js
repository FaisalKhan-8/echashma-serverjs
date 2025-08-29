const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config');
const jwt = require('jsonwebtoken');

// const createCustomerInvoice = async (req, res, next) => {
//   const { companyId, branchId: userBranchId, role } = req.user;
//   const { branchId: queryBranchId } = req.query;

//   try {
//     // Validate request body
//     if (!req.body || Object.keys(req.body).length === 0) {
//       throw new AppError('Request body is empty', 400);
//     }

//     // Destructure request data
//     const { products, orderDate, gstStatus, ...invoiceData } = req.body;

//     // Validate products array
//     if (!products || !Array.isArray(products) || products.length === 0) {
//       throw new AppError('Valid products array is required', 400);
//     }

//     // Check required product fields
//     const missingProductFields = products.some(
//       (product) =>
//         !product.productId || !product.brandId || !product.frameTypeId
//       // !product.shapeId
//     );
//     if (missingProductFields) {
//       throw new AppError('All product fields are required', 400);
//     }

//     // Validate company association
//     if (!companyId) {
//       throw new AppError('User company not found', 400);
//     }

//     // Determine branch ID based on role
//     let branchId;
//     if (role === 'MANAGER') {
//       branchId = parseInt(userBranchId, 10);
//     } else if (['SUPER_ADMIN', 'ADMIN', 'SUBADMIN'].includes(role)) {
//       if (!queryBranchId) throw new AppError('Branch ID required', 400);
//       branchId = parseInt(queryBranchId, 10);
//     } else {
//       throw new AppError('Unauthorized role', 403);
//     }

//     // Generate unique invoice number
//     const generateInvoiceNo = async () => {
//       const lastInvoice = await db.customerInvoice.findFirst({
//         orderBy: { createdAt: 'desc' },
//         select: { orderNo: true },
//       });

//       const lastNumber = lastInvoice
//         ? parseInt(lastInvoice.orderNo.replace('EC', '')) || 0
//         : 0;
//       return `EC${lastNumber + 1}`;
//     };

//     const invoiceNo = await generateInvoiceNo();

//     // Calculate financials
//     const processFinancials = () => {
//       // Phase 1: Calculate item-level discounts
//       const itemsWithDiscounts = products.map((item) => {
//         const amountBeforeDiscount = item.price * item.quantity;
//         const itemDiscount =
//           ((item.discount || 0) / 100) * amountBeforeDiscount;
//         return {
//           ...item,
//           netAmount: amountBeforeDiscount - itemDiscount,
//         };
//       });

//       // Calculate subtotal before overall discount
//       const subtotalBeforeOverall = itemsWithDiscounts.reduce(
//         (sum, item) => sum + item.netAmount,
//         0
//       );

//       // Apply overall discount
//       const overallDiscount =
//         ((invoiceData.discount || 0) / 100) * subtotalBeforeOverall;
//       const subtotalAfterDiscount = subtotalBeforeOverall - overallDiscount;

//       // Phase 2: Calculate GST and final amounts
//       return itemsWithDiscounts.map((item) => {
//         // Calculate proportional discount
//         const itemProportion = item.netAmount / subtotalBeforeOverall || 0;
//         const itemShareOfDiscount = overallDiscount * itemProportion;

//         // Calculate taxable amount after all discounts
//         const taxableAmount = item.netAmount - itemShareOfDiscount;

//         // Calculate GST if applicable
//         let cgst = 0;
//         let sgst = 0;
//         let finalAmount = taxableAmount;

//         if (gstStatus) {
//           const gstAmount = taxableAmount * 0.18;
//           cgst = gstAmount / 2;
//           sgst = gstAmount / 2;
//           finalAmount += gstAmount;
//         }

//         // Stringify the prescription objects
//         const leftEyeStr = item.leftEye ? JSON.stringify(item.leftEye) : null;
//         const rightEyeStr = item.rightEye
//           ? JSON.stringify(item.rightEye)
//           : null;

//         return {
//           productId: item.productId,
//           quantity: item.quantity,
//           rate: item.price,
//           discount: item.discount || 0,
//           amount: Number(finalAmount.toFixed(2)),
//           cgst: Number(cgst.toFixed(2)),
//           sgst: Number(sgst.toFixed(2)),
//           modalNo: item.modalNo,
//           frameTypeId: item.frameTypeId,
//           visionTypeId: item.visionTypeId,
//           // shapeTypeId: item.shapeId,
//           brandId: item.brandId,
//           leftEye: leftEyeStr,
//           rightEye: rightEyeStr,
//         };
//       });
//     };

//     // Process item calculations
//     const items = processFinancials();

//     // Calculate totals
//     const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
//     const totalCGST = items.reduce((sum, item) => sum + item.cgst, 0);
//     const totalSGST = items.reduce((sum, item) => sum + item.sgst, 0);
//     const balanceAmount = totalAmount - (invoiceData.advance || 0);

//     // Validate dates
//     const orderDateObj = new Date(orderDate);
//     if (isNaN(orderDateObj)) throw new AppError('Invalid order date', 400);

//     // Database transaction
//     const newInvoice = await db.$transaction(async (prisma) => {
//       // Inventory updates
//       for (const product of products) {
//         const inventory = await prisma.inventory.findFirst({
//           where: {
//             productId: product.productId,
//             // shapeTypeId: product.shapeId,
//             brandId: product.brandId,
//             frameTypeId: product.frameTypeId,
//             companyId,
//             branchId,
//           },
//         });

//         if (!inventory) {
//           throw new AppError(
//             `Inventory not found for product ${product.productId}`,
//             400
//           );
//         }

//         if (inventory.stock < product.quantity) {
//           throw new AppError(
//             `Insufficient stock for product ${product.productId} (${inventory.stock} available)`,
//             400
//           );
//         }

//         await prisma.inventory.update({
//           where: { id: inventory.id },
//           data: { stock: inventory.stock - product.quantity },
//         });
//       }

//       // Create invoice
//       return await prisma.customerInvoice.create({
//         data: {
//           ...invoiceData,
//           orderNo: invoiceNo,
//           orderDate: orderDateObj,
//           totalAmount: Number(totalAmount.toFixed(2)),
//           totalCGST: Number(totalCGST.toFixed(2)),
//           totalSGST: Number(totalSGST.toFixed(2)),
//           totalGST: Number((totalCGST + totalSGST).toFixed(2)),
//           companyId,
//           branchId,
//           advance: Number((invoiceData.advance || 0).toFixed(2)),
//           balance: Number(balanceAmount.toFixed(2)),
//           items: { create: items },
//         },
//         include: { items: true },
//       });
//     });

//     return res.status(201).json(newInvoice);
//   } catch (error) {
//     next(error);
//   }
// };

const createCustomerInvoice = async (req, res, next) => {
  const { companyId, branchId: userBranchId, role } = req.user;
  const { branchId: queryBranchId } = req.query;

  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      throw new AppError('Request body is empty', 400);
    }

    const { products, orderDate, gstStatus, ...invoiceData } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      throw new AppError('Valid products array is required', 400);
    }

    const missingProductFields = products.some(
      (product) =>
        !product.productId || !product.brandId || !product.frameTypeId
    );
    if (missingProductFields) {
      throw new AppError('All product fields are required', 400);
    }

    if (!companyId) throw new AppError('User company not found', 400);

    // ✅ Determine branch ID
    let branchId;
    if (role === 'MANAGER') {
      branchId = parseInt(userBranchId, 10);
    } else if (['SUPER_ADMIN', 'ADMIN', 'SUBADMIN'].includes(role)) {
      if (!queryBranchId) throw new AppError('Branch ID required', 400);
      branchId = parseInt(queryBranchId, 10);
    } else {
      throw new AppError('Unauthorized role', 403);
    }

    // ✅ Check branch negativeBilling flag
    const branch = await db.branch.findUnique({
      where: { id: branchId },
      select: { negativeBilling: true },
    });
    const allowNegative = branch?.negativeBilling ?? false;

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

    // Calculate items (same as before)
    const processFinancials = () => {
      const itemsWithDiscounts = products.map((item) => {
        const amountBeforeDiscount = item.price * item.quantity;
        const itemDiscount =
          ((item.discount || 0) / 100) * amountBeforeDiscount;
        return { ...item, netAmount: amountBeforeDiscount - itemDiscount };
      });

      const subtotalBeforeOverall = itemsWithDiscounts.reduce(
        (sum, item) => sum + item.netAmount,
        0
      );

      const overallDiscount =
        ((invoiceData.discount || 0) / 100) * subtotalBeforeOverall;
      const subtotalAfterDiscount = subtotalBeforeOverall - overallDiscount;

      return itemsWithDiscounts.map((item) => {
        const itemProportion = item.netAmount / subtotalBeforeOverall || 0;
        const itemShareOfDiscount = overallDiscount * itemProportion;

        const taxableAmount = item.netAmount - itemShareOfDiscount;

        let cgst = 0,
          sgst = 0,
          finalAmount = taxableAmount;

        if (gstStatus) {
          const gstAmount = taxableAmount * 0.18;
          cgst = gstAmount / 2;
          sgst = gstAmount / 2;
          finalAmount += gstAmount;
        }

        const leftEyeStr = item.leftEye ? JSON.stringify(item.leftEye) : null;
        const rightEyeStr = item.rightEye
          ? JSON.stringify(item.rightEye)
          : null;

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
          visionTypeId: item.visionTypeId,
          brandId: item.brandId,
          leftEye: leftEyeStr,
          rightEye: rightEyeStr,
        };
      });
    };

    const items = processFinancials();
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
    const totalCGST = items.reduce((sum, item) => sum + item.cgst, 0);
    const totalSGST = items.reduce((sum, item) => sum + item.sgst, 0);
    const balanceAmount = totalAmount - (invoiceData.advance || 0);

    const orderDateObj = new Date(orderDate);
    if (isNaN(orderDateObj)) throw new AppError('Invalid order date', 400);

    // ✅ Transaction
    const newInvoice = await db.$transaction(async (prisma) => {
      for (const product of products) {
        const where = {
          productId: product.productId,
          brandId: product.brandId,
          frameTypeId: product.frameTypeId,
          companyId,
          branchId,
        };

        let inventory = await prisma.inventory.findFirst({ where });

        if (!inventory) {
          if (!allowNegative) {
            throw new AppError(
              `Inventory not found for product ${product.name}`,
              400
            );
          }
          // ✅ create negative inventory
          inventory = await prisma.inventory.create({
            data: {
              ...where,
              stock: -product.quantity,
              price: product.price,
              ...(product.modalNo && { modalNo: product.modalNo }),
            },
          });
        } else {
          // ✅ update inventory (allow negative if flag is true)
          if (!allowNegative && inventory.stock < product.quantity) {
            throw new AppError(
              `Insufficient stock for product ${product.name} (${inventory.stock} available)`,
              400
            );
          }
          await prisma.inventory.update({
            where: { id: inventory.id },
            data: { stock: inventory.stock - product.quantity },
          });
        }
      }

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

const updateCustomerInvoice = async (req, res, next) => {
  const { companyId, branchId: userBranchId, role } = req.user;
  const { branchId: queryBranchId } = req.query;
  const invoiceId = parseInt(req.params.id, 10);

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
        !product.productId || !product.brandId || !product.frameTypeId
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

    // Get existing invoice
    const existingInvoice = await db.customerInvoice.findUnique({
      where: { id: invoiceId },
      include: { items: true },
    });

    if (!existingInvoice) {
      throw new AppError('Invoice not found', 404);
    }

    // Database transaction
    const updatedInvoice = await db.$transaction(async (prisma) => {
      // Revert old inventory quantities
      for (const item of existingInvoice.items) {
        const inventory = await prisma.inventory.findFirst({
          where: {
            productId: item.productId,
            brandId: item.brandId,
            frameTypeId: item.frameTypeId,
            companyId,
            branchId,
          },
        });

        if (!inventory) {
          throw new AppError(
            `Inventory not found for product ${item.productId} (revert)`,
            400
          );
        }

        await prisma.inventory.update({
          where: { id: inventory.id },
          data: { stock: inventory.stock + item.quantity },
        });
      }

      // Financial calculation (identical to create API)
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

          // Stringify the prescription objects
          const leftEyeStr = item.leftEye ? JSON.stringify(item.leftEye) : null;
          const rightEyeStr = item.rightEye
            ? JSON.stringify(item.rightEye)
            : null;

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
            visionTypeId: item.visionTypeId,
            brandId: item.brandId,
            leftEye: leftEyeStr,
            rightEye: rightEyeStr,
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

      // Update inventory with new quantities
      for (const product of products) {
        const inventory = await prisma.inventory.findFirst({
          where: {
            productId: product.productId,
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

      // CORRECTED: Use proper model name from your schema
      await prisma.customerInvoiceItem.deleteMany({
        where: { invoiceId: existingInvoice.id },
      });

      // Update invoice
      return await prisma.customerInvoice.update({
        where: { id: existingInvoice.id },
        data: {
          ...invoiceData,
          orderDate: orderDateObj,
          totalAmount: Number(totalAmount.toFixed(2)),
          totalCGST: Number(totalCGST.toFixed(2)),
          totalSGST: Number(totalSGST.toFixed(2)),
          totalGST: Number((totalCGST + totalSGST).toFixed(2)),
          advance: Number((invoiceData.advance || 0).toFixed(2)),
          balance: Number(balanceAmount.toFixed(2)),
          items: { create: items },
        },
        include: { items: true },
      });
    });

    return res.status(200).json(updatedInvoice);
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
            },
          },
          {
            customerName: {
              contains: searchTerm,
            },
          },
          {
            customerPhone: {
              contains: searchTerm,
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
            visionType: true,
            // shapeType: true, // Include related shapeType details
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
            },
          },
          {
            customerName: {
              contains: searchTerm,
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
              visionType: true,
              // shapeType: true, // Include related shapeType details
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
            visionType: true,
            // shapeType: true, // Include related shapeType details
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

const verifyPhone = async (req, res) => {
  const { invoiceId, phone } = req.body;

  try {
    // Validate invoice exists with this phone
    const invoice = await db.customerInvoice.findFirst({
      where: {
        id: parseInt(invoiceId),
        customerPhone: phone.replace(/\D/g, ''),
      },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found with this phone number',
      });
    }

    // Generate access token (valid for 1 hour)
    const token = jwt.sign({ invoiceId, phone }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.json({
      success: true,
      token,
    });
  } catch (error) {
    console.error('Error verifying phone:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

const getInvoice = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token required' });

    console.log('Token:', token);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log('Decoded token:', decoded);

    const invoice = await db.customerInvoice.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        items: {
          include: { product: true },
        },
        company: true,
        branch: true,
      },
    });

    if (
      !invoice ||
      invoice.id !== parseInt(decoded.invoiceId) ||
      invoice.customerPhone !== decoded.phone
    ) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    res.json(invoice);
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = {
  createCustomerInvoice,
  updateCustomerInvoice,
  getAllCustomerInvoices,
  getCustomerInvoiceById,
  verifyPhone,
  getInvoice,
};
