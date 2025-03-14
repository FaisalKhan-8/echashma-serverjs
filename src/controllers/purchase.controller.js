const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config');

// exports.createPurchase = async (req, res, next) => {
//   const { purchaseDate, billNo, supplierId, items, gstStatus } = req.body;
//   const { companyId, branchId: userBranchId, role } = req.user;
//   const { branchId: queryBranchId } = req.query;

//   try {
//     // Step 1: Validate company and user role to determine branchId
//     if (!companyId) {
//       throw new AppError('Invalid company. Please authenticate first.', 401);
//     }

//     // Step 2: Assign branchId based on user role
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
//       branchId = parseInt(queryBranchId, 10);
//     } else {
//       return res.status(403).json({ message: 'Unauthorized role' });
//     }

//     if (!branchId) {
//       return res.status(400).json({ message: 'Branch ID is required' });
//     }

//     // Step 3: Validate required fields
//     if (
//       !purchaseDate ||
//       !billNo ||
//       !supplierId ||
//       !items ||
//       items.length === 0
//     ) {
//       throw new AppError(
//         'Invalid input data. Please provide all required fields.',
//         400
//       );
//     }

//     // Step 4: Check for existing purchase with same billNo in the same branch
//     const existingPurchase = await db.purchase.findFirst({
//       where: { billNo, companyId, branchId }, // Include branchId in check
//     });
//     if (existingPurchase) {
//       throw new AppError(
//         'Purchase with this Bill No already exists for this branch and company',
//         400
//       );
//     }

//     // Step 5: Validate supplier
//     const supplier = await db.supplier.findFirst({ where: { id: supplierId } });
//     if (!supplier) {
//       throw new AppError('Invalid supplier', 400);
//     }

//     // Step 6: Calculate purchase totals and prepare items
//     // Step 6: Calculate purchase totals and prepare items
//     let totalAmount = 0;
//     let totalCGST = 0;
//     let totalSGST = 0;
//     let netTotal = 0;

//     const purchaseItemsData = items.map((item) => {
//       const {
//         productId,
//         quantity,
//         rate,
//         discount = 0,
//         modalNo = null,
//         frameTypeId,
//         shapeId,
//         brandId,
//       } = item;

//       // Calculate per-unit discount and price after discount
//       const discountPerUnit = rate * (discount / 100);
//       const perUnitAfterDiscount = rate - discountPerUnit;

//       // Calculate per-unit GST if enabled
//       let perUnitCGST = 0;
//       let perUnitSGST = 0;
//       let perUnitPriceWithGST = perUnitAfterDiscount;

//       if (gstStatus) {
//         perUnitCGST = Math.round(perUnitAfterDiscount * 0.09);
//         perUnitSGST = Math.round(perUnitAfterDiscount * 0.09);
//         perUnitPriceWithGST = perUnitAfterDiscount + perUnitCGST + perUnitSGST;
//       }

//       // Calculate line totals (for purchase record)
//       const totalLineAmount = perUnitAfterDiscount * quantity;
//       const totalLineCGST = perUnitCGST * quantity;
//       const totalLineSGST = perUnitSGST * quantity;
//       const totalLineWithGST = perUnitPriceWithGST * quantity;

//       // Accumulate totals for the purchase record
//       totalAmount += totalLineAmount;
//       totalCGST += totalLineCGST;
//       totalSGST += totalLineSGST;
//       netTotal += totalLineWithGST;

//       return {
//         productId,
//         quantity,
//         rate,
//         discount,
//         amount: totalLineAmount, // Total line amount without GST
//         cgst: totalLineCGST, // Total CGST for the line
//         sgst: totalLineSGST, // Total SGST for the line
//         price: perUnitPriceWithGST, // Per-unit price including GST
//         modalNo,
//         frameTypeId,
//         shapeTypeId: shapeId,
//         brandId,
//       };
//     });

//     const roundOff = Math.round(netTotal) - netTotal;

//     // Step 7: Create purchase and update inventory in a transaction
//     const newPurchase = await db.$transaction(
//       async (prisma) => {
//         // Create the purchase with branchId and associated items
//         const purchase = await prisma.purchase.create({
//           data: {
//             purchaseDate: new Date(purchaseDate),
//             billNo,
//             supplierId,
//             companyId,
//             branchId,
//             totalAmount,
//             totalCGST: gstStatus ? Math.round(totalCGST) : 0,
//             totalSGST: gstStatus ? Math.round(totalSGST) : 0,
//             netTotal: netTotal + roundOff,
//             items: {
//               create: purchaseItemsData.map((item) => ({
//                 product: { connect: { id: item.productId } },
//                 quantity: item.quantity,
//                 rate: item.rate,
//                 discount: item.discount,
//                 amount: item.amount,
//                 cgst: item.cgst,
//                 sgst: item.sgst,
//                 modalNo: item.modalNo || null,
//                 FrameType: { connect: { id: item.frameTypeId } },
//                 ShapeType: { connect: { id: item.shapeTypeId } },
//                 Brand: { connect: { id: item.brandId } },
//               })),
//             },
//           },
//           include: { items: true },
//         });

//         // Inventory update/creation using per-unit price
//         const orConditions = purchaseItemsData.map((item) => ({
//           productId: item.productId,
//           frameTypeId: item.frameTypeId,
//           shapeTypeId: item.shapeTypeId,
//           brandId: item.brandId,
//           price: item.price, // Use per-unit price with GST
//           companyId,
//           branchId,
//         }));

//         const existingInventories = await prisma.inventory.findMany({
//           where: { OR: orConditions },
//         });

//         const inventoryPromises = purchaseItemsData.map(async (item) => {
//           const match = existingInventories.find(
//             (inv) =>
//               inv.productId === item.productId &&
//               inv.frameTypeId === item.frameTypeId &&
//               inv.shapeTypeId === item.shapeTypeId &&
//               inv.brandId === item.brandId &&
//               inv.branchId === branchId
//           );

//           const modalNoData = item.modalNo ? { modalNo: item.modalNo } : {};

//           if (match) {
//             return prisma.inventory.update({
//               where: { id: match.id },
//               data: {
//                 stock: { increment: item.quantity },
//                 price: item.price, // per-unit price is saved here
//                 ...modalNoData,
//               },
//             });
//           } else {
//             return prisma.inventory.create({
//               data: {
//                 productId: item.productId,
//                 frameTypeId: item.frameTypeId,
//                 shapeTypeId: item.shapeTypeId,
//                 brandId: item.brandId,
//                 companyId,
//                 branchId,
//                 stock: item.quantity,
//                 price: item.price, // per-unit price is set here
//                 ...modalNoData,
//               },
//             });
//           }
//         });

//         await Promise.all(inventoryPromises);
//         return purchase;
//       },
//       { timeout: 30000 }
//     );

//     res.status(201).json({ success: true, data: newPurchase });
//   } catch (error) {
//     next(error);
//   }
// };

// Update a purchase with GST and discount calculations

exports.createPurchase = async (req, res, next) => {
  const { purchaseDate, billNo, supplierId, items, gstStatus } = req.body;
  const { companyId, branchId: userBranchId, role } = req.user;
  const { branchId: queryBranchId } = req.query;

  try {
    // Validate company and role
    if (!companyId) throw new AppError('Company authentication required', 401);
    if (typeof gstStatus !== 'boolean')
      throw new AppError('Invalid GST status', 400);

    // Determine branchId based on role
    let branchId;
    if (role === 'MANAGER') {
      branchId = parseInt(userBranchId, 10);
    } else if (['SUPER_ADMIN', 'ADMIN', 'SUBADMIN'].includes(role)) {
      if (!queryBranchId)
        return res.status(400).json({ message: 'Branch ID required' });
      branchId = parseInt(queryBranchId, 10);
    } else {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    // Validate required fields
    if (!purchaseDate || !billNo || !supplierId || !items?.length) {
      throw new AppError('Missing required fields', 400);
    }

    // Check for duplicate bill number
    const existingPurchase = await db.purchase.findFirst({
      where: { billNo, companyId, branchId },
    });
    if (existingPurchase) throw new AppError('Bill number already exists', 409);

    // Validate supplier exists
    const supplier = await db.supplier.findUnique({
      where: { id: supplierId },
    });
    if (!supplier) throw new AppError('Supplier not found', 404);

    // Calculate purchase totals
    let totalAmount = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let grandTotal = 0;

    const purchaseItemsData = items.map((item) => {
      // Calculate discounted rate
      const discount = item.discount || 0;
      const discountedRate = item.rate - item.rate * (discount / 100);
      const lineTotal = discountedRate * item.quantity;

      // Calculate GST
      let cgst = 0;
      let sgst = 0;
      if (gstStatus) {
        cgst = lineTotal * 0.09; // 9% CGST
        sgst = lineTotal * 0.09; // 9% SGST
      }

      const netAmount = lineTotal + cgst + sgst;

      // Accumulate totals
      totalAmount += lineTotal;
      totalCGST += cgst;
      totalSGST += sgst;
      grandTotal += netAmount;

      return {
        ...item,
        discountedRate,
        lineTotal,
        cgst,
        sgst,
        netAmount,
      };
    });

    // Create purchase transaction
    const newPurchase = await db.$transaction(async (prisma) => {
      // Create purchase record
      const purchase = await prisma.purchase.create({
        data: {
          purchaseDate: new Date(purchaseDate),
          billNo,
          supplierId,
          companyId,
          branchId,
          gstStatus,
          totalAmount,
          totalCGST,
          totalSGST,
          netTotal: grandTotal,
          items: {
            create: purchaseItemsData.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              rate: item.rate,
              discount: item.discount,
              amount: item.lineTotal,
              cgst: item.cgst,
              sgst: item.sgst,
              netAmount: item.netAmount,
              modalNo: item.modalNo,
              frameTypeId: item.frameTypeId,
              shapeTypeId: item.shapeId,
              brandId: item.brandId,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
              Brand: true,
              FrameType: true,
              ShapeType: true,
            },
          },
          supplier: true,
          branch: true,
          Company: true,
        },
      });

      // Update inventory with non-GST prices
      await Promise.all(
        purchaseItemsData.map(async (item) => {
          const where = {
            productId: item.productId,
            frameTypeId: item.frameTypeId,
            shapeTypeId: item.shapeId,
            brandId: item.brandId,
            companyId,
            branchId,
          };

          const existing = await prisma.inventory.findFirst({ where });

          const updateData = {
            stock: { increment: item.quantity },
            price: item.discountedRate, // Store without GST
            ...(item.modalNo && { modalNo: item.modalNo }),
          };

          if (existing) {
            return prisma.inventory.update({
              where: { id: existing.id },
              data: updateData,
            });
          }

          return prisma.inventory.create({
            data: { ...where, ...updateData },
          });
        })
      );

      return purchase;
    });

    // Format invoice response
    const invoiceData = {
      billNo: newPurchase.billNo,
      date: newPurchase.purchaseDate,
      supplier: {
        name: newPurchase.supplier.name,
        gstin: newPurchase.supplier.gstin,
      },
      company: {
        name: newPurchase.Company.companyName,
        address: newPurchase.Company.address,
      },
      branch: newPurchase.branch.branchName,
      items: newPurchase.items.map((item) => ({
        code: item.product.code,
        name: item.product.name,
        brand: item.Brand.name,
        frameType: item.FrameType.name,
        shape: item.ShapeType.name,
        quantity: item.quantity,
        rate: item.rate,
        discount: item.discount,
        amount: item.amount,
        gst: item.cgst + item.sgst,
        netAmount: item.netAmount,
      })),
      totals: {
        totalAmount: newPurchase.totalAmount,
        totalGST: newPurchase.totalCGST + newPurchase.totalSGST,
        grandTotal: newPurchase.netTotal,
      },
    };

    res.status(201).json({
      success: true,
      data: invoiceData,
    });
  } catch (error) {
    next(error);
  }
};

exports.updatePurchase = async (req, res, next) => {
  const { id } = req.params;
  const {
    purchaseDate,
    billNo,
    supplierId,
    gstStatus,
    items: originalItems,
  } = req.body; // Rename to originalItems for clarity
  const { companyId, branchId: userBranchId, role } = req.user;
  const { branchId: queryBranchId } = req.query;

  try {
    if (!companyId) throw new AppError('Authentication required', 401);

    let branchId;
    if (role === 'MANAGER') {
      branchId = userBranchId;
    } else if (['SUPER_ADMIN', 'ADMIN', 'SUBADMIN'].includes(role)) {
      if (!queryBranchId) throw new AppError('Branch ID required', 400);
      branchId = parseInt(queryBranchId, 10);
      const existingPurchaseBranch = await db.purchase.findUnique({
        where: { id: parseInt(id) },
      });
      if (existingPurchaseBranch.branchId !== branchId) {
        throw new AppError('Cannot change branch of purchase', 400);
      }
    } else {
      throw new AppError('Unauthorized access', 403);
    }

    const existingPurchase = await db.purchase.findUnique({
      where: { id: parseInt(id) },
      include: { items: true, supplier: true },
    });

    if (!existingPurchase || existingPurchase.companyId !== companyId) {
      throw new AppError('Purchase not found', 404);
    }

    if (billNo && billNo !== existingPurchase.billNo) {
      const existingBill = await db.purchase.findFirst({
        where: { billNo, companyId, branchId },
      });
      if (existingBill) throw new AppError('Bill number exists', 400);
    }

    if (supplierId && supplierId !== existingPurchase.supplierId) {
      const supplier = await db.supplier.findUnique({
        where: { id: supplierId },
      });
      if (!supplier) throw new AppError('Invalid supplier', 400);
    }

    let totalAmount = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let netTotal = 0;

    const updateData = {
      purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
      billNo: billNo ?? undefined,
      supplierId: supplierId ?? undefined,
      branchId,
    };

    if (originalItems && originalItems.length > 0) {
      await reverseInventory(existingPurchase.items, companyId, branchId);

      const { updatedItems, totals } = await processPurchaseItems(
        originalItems, // Use originalItems here
        companyId,
        gstStatus
      );

      updatedItems.forEach((item) => {
        if (!item.productId || !item.quantity || !item.rate) {
          throw new AppError('Missing required item fields', 400);
        }
      });

      ({ totalAmount, totalCGST, totalSGST, netTotal } = totals);

      const roundOff = Math.round(netTotal) - netTotal;

      Object.assign(updateData, {
        totalAmount,
        totalCGST: gstStatus ? Math.round(totalCGST) : 0,
        totalSGST: gstStatus ? Math.round(totalSGST) : 0,
        netTotal: netTotal + roundOff,
        items: {
          deleteMany: {},
          create: updatedItems.map((processedItem, index) => {
            const originalItem = originalItems[index]; // Get corresponding original item
            return {
              productId: processedItem.productId,
              quantity: processedItem.quantity,
              rate: processedItem.rate,
              discount: processedItem.discount ?? 0,
              amount: processedItem.amount,
              cgst: processedItem.cgst ?? 0,
              sgst: processedItem.sgst ?? 0,
              netAmount:
                processedItem.netAmount ??
                processedItem.amount +
                  (processedItem.cgst || 0) +
                  (processedItem.sgst || 0),
              // Use original item data for these fields to ensure they are preserved
              frameTypeId: originalItem.frameTypeId ?? null,
              shapeTypeId: originalItem.shapeTypeId ?? null,
              brandId: originalItem.brandId ?? null,
              modalNo: originalItem.modalNo ?? null,
            };
          }),
        },
      });
    }

    const updatedPurchase = await db.$transaction(async (prisma) => {
      const purchase = await prisma.purchase.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: { items: true },
      });

      if (originalItems?.length) {
        // Enhanced inventory update
        await Promise.all(
          updateData.items.create.map(async (item) => {
            const where = {
              productId: item.productId,
              frameTypeId: item.frameTypeId,
              shapeTypeId: item.shapeTypeId,
              brandId: item.brandId,
              companyId,
              branchId,
            };

            const existing = await prisma.inventory.findFirst({ where });

            const updateData = {
              stock: { increment: item.quantity },
              price: item.rate - (item.rate * (item.discount || 0)) / 100,
              ...(item.modalNo && { modalNo: item.modalNo }),
            };

            if (existing) {
              return prisma.inventory.update({
                where: { id: existing.id },
                data: updateData,
              });
            }

            return prisma.inventory.create({
              data: { ...where, ...updateData },
            });
          })
        );
      }

      return purchase;
    });

    res.status(200).json({ success: true, data: updatedPurchase });
  } catch (error) {
    next(error);
  }
};

// Helper functions
async function reverseInventory(items, companyId, branchId) {
  return Promise.all(
    items.map(async (item) => {
      const inventory = await db.inventory.findFirst({
        where: {
          productId: item.productId,
          frameTypeId: item.frameTypeId,
          shapeTypeId: item.shapeTypeId,
          brandId: item.brandId,
          companyId,
          branchId,
        },
      });

      if (inventory) {
        await db.inventory.update({
          where: { id: inventory.id },
          data: { stock: { decrement: item.quantity } },
        });
      }
    })
  );
}

async function processPurchaseItems(items, companyId, gstStatus) {
  const updatedItems = [];
  let totalAmount = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let netTotal = 0;

  for (const item of items) {
    const {
      productId,
      quantity,
      rate,
      discount = 0,
      frameTypeId,
      shapeId,
      brandId,
    } = item;

    // Validate product existence
    const product = await db.product.findUnique({
      where: { id: productId, companyId },
    });
    if (!product) throw new AppError(`Invalid product: ${productId}`, 400);

    // Calculate item totals
    const discountPerUnit = rate * (discount / 100);
    const priceAfterDiscount = rate - discountPerUnit;

    let perUnitCGST = 0;
    let perUnitSGST = 0;
    let priceWithGST = priceAfterDiscount;

    if (gstStatus) {
      perUnitCGST = Math.round(priceAfterDiscount * 0.09);
      perUnitSGST = Math.round(priceAfterDiscount * 0.09);
      priceWithGST += perUnitCGST + perUnitSGST;
    }

    const lineTotal = priceAfterDiscount * quantity;
    const lineCGST = perUnitCGST * quantity;
    const lineSGST = perUnitSGST * quantity;
    const lineNetTotal = priceWithGST * quantity;

    // Accumulate totals
    totalAmount += lineTotal;
    totalCGST += lineCGST;
    totalSGST += lineSGST;
    netTotal += lineNetTotal;

    updatedItems.push({
      productId,
      quantity,
      rate,
      discount,
      amount: lineTotal,
      cgst: lineCGST,
      sgst: lineSGST,
      frameTypeId,
      shapeTypeId: shapeId,
      brandId,
    });
  }

  return {
    updatedItems,
    totals: { totalAmount, totalCGST, totalSGST, netTotal },
  };
}

async function updateInventory(prisma, items, companyId, branchId) {
  return Promise.all(
    items.map(async (item) => {
      const where = {
        productId: item.productId,
        frameTypeId: item.frameTypeId,
        shapeTypeId: item.shapeTypeId,
        brandId: item.brandId,
        companyId,
        branchId,
      };

      // Calculate priceWithGST based on item data
      const discountFactor = 1 - item.discount / 100;
      const priceAfterDiscount = item.rate * discountFactor;
      const perUnitCGST = item.cgst / item.quantity;
      const perUnitSGST = item.sgst / item.quantity;
      const priceWithGST = priceAfterDiscount + perUnitCGST + perUnitSGST;

      const existing = await prisma.inventory.findFirst({ where });

      if (existing) {
        await prisma.inventory.update({
          where: { id: existing.id },
          data: {
            stock: { increment: item.quantity },
            price: priceWithGST,
          },
        });
      } else {
        await prisma.inventory.create({
          data: {
            ...where,
            stock: item.quantity,
            price: priceWithGST,
          },
        });
      }
    })
  );
}

// Get all purchases with pagination and search
exports.getAllPurchases = async (req, res, next) => {
  try {
    // Extract user details from the token
    const { companyId, branchId: userBranchId, role } = req.user;

    // Extract query parameters
    const {
      page = 1,
      limit = 10,
      search = '',
      companyId: queryCompanyId,
      branchId: queryBranchId,
    } = req.query;

    let branchId;
    let companyFilter = {};

    // Determine branchId and companyFilter based on user role
    if (role === 'SUPER_ADMIN') {
      // SUPER_ADMIN can specify companyId and branchId via query
      if (queryCompanyId) {
        const parsedCompanyId = parseInt(queryCompanyId, 10);
        if (isNaN(parsedCompanyId)) {
          return next(new AppError('Invalid companyId provided', 400));
        }
        companyFilter.companyId = parsedCompanyId;
      }
      if (queryBranchId) {
        branchId = parseInt(queryBranchId, 10);
        if (isNaN(branchId)) {
          return next(new AppError('Invalid branchId provided', 400));
        }
      }
    } else if (role === 'ADMIN' || role === 'SUBADMIN') {
      // ADMIN/SUBADMIN are restricted to their company, can specify branchId
      if (!companyId) {
        return next(new AppError('Company ID is required', 400));
      }
      companyFilter.companyId = companyId;
      if (queryBranchId) {
        branchId = parseInt(queryBranchId, 10);
        if (isNaN(branchId)) {
          return next(new AppError('Invalid branchId provided', 400));
        }
      }
    } else if (role === 'MANAGER') {
      // MANAGER is restricted to their own branch and company
      if (!companyId || !userBranchId) {
        return next(new AppError('Company or Branch ID is missing', 400));
      }
      companyFilter.companyId = companyId;
      branchId = parseInt(userBranchId, 10);
      if (isNaN(branchId)) {
        return next(new AppError('Invalid branchId in token', 400));
      }
    } else {
      // Unauthorized roles
      return next(
        new AppError('You do not have permission to view purchases', 403)
      );
    }

    // Parse pagination parameters
    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNumber - 1) * pageLimit;

    // Build search conditions
    const searchClause = search
      ? {
          OR: [
            { billNo: { contains: search, mode: 'insensitive' } },
            { supplier: { name: { contains: search, mode: 'insensitive' } } },
            {
              items: {
                some: {
                  product: { name: { contains: search, mode: 'insensitive' } },
                },
              },
            },
          ],
        }
      : {};

    // Combine all conditions into the where clause
    const whereClause = {
      ...companyFilter,
      ...(branchId !== undefined && { branchId }),
      ...searchClause,
    };

    // Fetch purchases and total count in parallel
    const [purchases, total] = await Promise.all([
      db.purchase.findMany({
        where: whereClause,
        skip,
        take: pageLimit,
        include: {
          items: {
            include: {
              product: true,
              Brand: true, // This is correct as per PurchaseItem model
              FrameType: true,
              ShapeType: true,
            },
          },
          supplier: true,
          Company: true, // Matches uppercase field in Purchase model
          branch: true, // Changed to lowercase to match model field
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.purchase.count({ where: whereClause }),
    ]);

    // Handle no purchases found
    if (purchases.length === 0) {
      return next(new AppError('No purchases found', 404));
    }

    // Send response with pagination data
    res.status(200).json({
      status: 'success',
      data: purchases,
      pagination: {
        total,
        totalPages: Math.ceil(total / pageLimit),
        currentPage: pageNumber,
        limit: pageLimit,
      },
    });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    next(new AppError('Internal server error', 500));
  }
};

// Get a specific purchase by ID
exports.getPurchaseById = async (req, res) => {
  const { id } = req.params;
  const { companyId, branchId: userBranchId, role } = req.user;
  const { branchId: queryBranchId } = req.query;

  try {
    // Determine branch ID
    let branchId;
    if (role === 'MANAGER') {
      branchId = userBranchId;
    } else if (['SUPER_ADMIN', 'ADMIN', 'SUBADMIN'].includes(role)) {
      if (!queryBranchId) {
        return res.status(400).json({
          success: false,
          message: 'Branch ID is required',
        });
      }
      branchId = parseInt(queryBranchId, 10);
    }

    const whereClause = {
      id: parseInt(id),
      companyId: ['SUPER_ADMIN'].includes(role) ? undefined : companyId,
      branchId,
    };

    const purchase = await db.purchase.findUnique({
      where: whereClause,
      include: {
        items: {
          include: {
            product: true,
            Brand: true,
            FrameType: true,
            ShapeType: true,
          },
        },
        supplier: true,
        Company: true,
        Branch: true,
      },
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found',
      });
    }

    res.status(200).json({ success: true, data: purchase });
  } catch (error) {
    console.error('Error fetching purchase:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Delete a specific purchase by ID
exports.deletePurchase = async (req, res) => {
  const { purchaseId } = req.params;

  if (!purchaseId) {
    return res.status(400).json({ error: 'Purchase ID is required' });
  }

  try {
    // Check if the purchase exists
    const purchaseExists = await db.purchase.findUnique({
      where: { id: parseInt(purchaseId) },
    });

    if (!purchaseExists) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    // Delete related items and the purchase itself
    const deletedItems = await db.purchaseItem.deleteMany({
      where: { purchaseId: parseInt(purchaseId) },
    });

    const deletedPurchase = await db.purchase.delete({
      where: { id: parseInt(purchaseId) },
    });

    console.log('Purchase and related items deleted successfully:', {
      deletedItems,
      deletedPurchase,
    });
    res.json({ message: 'Purchase deleted successfully', deletedPurchase });
  } catch (error) {
    console.error('Error deleting purchase:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while deleting the purchase' });
  }
};
