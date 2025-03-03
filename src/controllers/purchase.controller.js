const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config');

exports.createPurchase = async (req, res, next) => {
  const { purchaseDate, billNo, supplierId, items, gstStatus } = req.body;
  const { companyId, branchId: userBranchId, role } = req.user;
  const { branchId: queryBranchId } = req.query;

  try {
    // Step 1: Validate company and user role to determine branchId
    if (!companyId) {
      throw new AppError('Invalid company. Please authenticate first.', 401);
    }

    // Step 2: Assign branchId based on user role
    let branchId;
    if (role === 'MANAGER') {
      branchId = parseInt(userBranchId, 10);
    } else if (
      role === 'SUPER_ADMIN' ||
      role === 'ADMIN' ||
      role === 'SUBADMIN'
    ) {
      if (!queryBranchId) {
        return res.status(400).json({ message: 'Branch ID is required' });
      }
      branchId = parseInt(queryBranchId, 10);
    } else {
      return res.status(403).json({ message: 'Unauthorized role' });
    }

    if (!branchId) {
      return res.status(400).json({ message: 'Branch ID is required' });
    }

    // Step 3: Validate required fields
    if (
      !purchaseDate ||
      !billNo ||
      !supplierId ||
      !items ||
      items.length === 0
    ) {
      throw new AppError(
        'Invalid input data. Please provide all required fields.',
        400
      );
    }

    // Step 4: Check for existing purchase with same billNo in the same branch
    const existingPurchase = await db.purchase.findFirst({
      where: { billNo, companyId, branchId }, // Include branchId in check
    });
    if (existingPurchase) {
      throw new AppError(
        'Purchase with this Bill No already exists for this branch and company',
        400
      );
    }

    // Step 5: Validate supplier
    const supplier = await db.supplier.findFirst({ where: { id: supplierId } });
    if (!supplier) {
      throw new AppError('Invalid supplier', 400);
    }

    // Step 6: Calculate purchase totals and prepare items
    // Step 6: Calculate purchase totals and prepare items
    let totalAmount = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let netTotal = 0;

    const purchaseItemsData = items.map((item) => {
      const {
        productId,
        quantity,
        rate,
        discount = 0,
        modalNo = null,
        frameTypeId,
        shapeId,
        brandId,
      } = item;

      // Calculate per-unit discount and price after discount
      const discountPerUnit = rate * (discount / 100);
      const perUnitAfterDiscount = rate - discountPerUnit;

      // Calculate per-unit GST if enabled
      let perUnitCGST = 0;
      let perUnitSGST = 0;
      let perUnitPriceWithGST = perUnitAfterDiscount;

      if (gstStatus) {
        perUnitCGST = Math.round(perUnitAfterDiscount * 0.09);
        perUnitSGST = Math.round(perUnitAfterDiscount * 0.09);
        perUnitPriceWithGST = perUnitAfterDiscount + perUnitCGST + perUnitSGST;
      }

      // Calculate line totals (for purchase record)
      const totalLineAmount = perUnitAfterDiscount * quantity;
      const totalLineCGST = perUnitCGST * quantity;
      const totalLineSGST = perUnitSGST * quantity;
      const totalLineWithGST = perUnitPriceWithGST * quantity;

      // Accumulate totals for the purchase record
      totalAmount += totalLineAmount;
      totalCGST += totalLineCGST;
      totalSGST += totalLineSGST;
      netTotal += totalLineWithGST;

      return {
        productId,
        quantity,
        rate,
        discount,
        amount: totalLineAmount, // Total line amount without GST
        cgst: totalLineCGST, // Total CGST for the line
        sgst: totalLineSGST, // Total SGST for the line
        price: perUnitPriceWithGST, // Per-unit price including GST
        modalNo,
        frameTypeId,
        shapeTypeId: shapeId,
        brandId,
      };
    });

    const roundOff = Math.round(netTotal) - netTotal;

    // Step 7: Create purchase and update inventory in a transaction
    const newPurchase = await db.$transaction(
      async (prisma) => {
        // Create the purchase with branchId and associated items
        const purchase = await prisma.purchase.create({
          data: {
            purchaseDate: new Date(purchaseDate),
            billNo,
            supplierId,
            companyId,
            branchId,
            totalAmount,
            totalCGST: gstStatus ? Math.round(totalCGST) : 0,
            totalSGST: gstStatus ? Math.round(totalSGST) : 0,
            netTotal: netTotal + roundOff,
            items: {
              create: purchaseItemsData.map((item) => ({
                product: { connect: { id: item.productId } },
                quantity: item.quantity,
                rate: item.rate,
                discount: item.discount,
                amount: item.amount,
                cgst: item.cgst,
                sgst: item.sgst,
                modalNo: item.modalNo || null,
                FrameType: { connect: { id: item.frameTypeId } },
                ShapeType: { connect: { id: item.shapeTypeId } },
                Brand: { connect: { id: item.brandId } },
              })),
            },
          },
          include: { items: true },
        });

        // Inventory update/creation using per-unit price
        const orConditions = purchaseItemsData.map((item) => ({
          productId: item.productId,
          frameTypeId: item.frameTypeId,
          shapeTypeId: item.shapeTypeId,
          brandId: item.brandId,
          price: item.price, // Use per-unit price with GST
          companyId,
          branchId,
        }));

        const existingInventories = await prisma.inventory.findMany({
          where: { OR: orConditions },
        });

        const inventoryPromises = purchaseItemsData.map(async (item) => {
          const match = existingInventories.find(
            (inv) =>
              inv.productId === item.productId &&
              inv.frameTypeId === item.frameTypeId &&
              inv.shapeTypeId === item.shapeTypeId &&
              inv.brandId === item.brandId &&
              inv.branchId === branchId
          );

          const modalNoData = item.modalNo ? { modalNo: item.modalNo } : {};

          if (match) {
            return prisma.inventory.update({
              where: { id: match.id },
              data: {
                stock: { increment: item.quantity },
                price: item.price, // per-unit price is saved here
                ...modalNoData,
              },
            });
          } else {
            return prisma.inventory.create({
              data: {
                productId: item.productId,
                frameTypeId: item.frameTypeId,
                shapeTypeId: item.shapeTypeId,
                brandId: item.brandId,
                companyId,
                branchId,
                stock: item.quantity,
                price: item.price, // per-unit price is set here
                ...modalNoData,
              },
            });
          }
        });

        await Promise.all(inventoryPromises);
        return purchase;
      },
      { timeout: 30000 }
    );

    res.status(201).json({ success: true, data: newPurchase });
  } catch (error) {
    next(error);
  }
};

// Update a purchase with GST and discount calculations
exports.updatePurchase = async (req, res, next) => {
  const { id } = req.params; // Extract purchase ID from the URL parameters
  const { purchaseDate, billNo, supplierId, gstStatus, items } = req.body;
  const { companyId } = req.user; // Using companyId from the authenticated user

  console.log(req.body);

  try {
    if (!companyId) {
      throw new AppError('Invalid company. Please authenticate first.', 401);
    }

    // Validate the purchase record
    const existingPurchase = await db.purchase.findFirst({
      where: { id: parseInt(id), companyId },
      include: { items: true },
    });

    if (!existingPurchase) {
      throw new AppError('Purchase not found', 404);
    }

    let totalAmount = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let netTotal = 0;

    // Build the update data dynamically
    const updateData = {};
    if (purchaseDate) updateData.purchaseDate = new Date(purchaseDate);
    if (billNo) updateData.billNo = billNo;
    if (supplierId) updateData.supplierId = supplierId;

    const updatedItems = [];
    if (Array.isArray(items) && items.length > 0) {
      // Reverse the inventory impact of the existing purchase
      const reverseInventoryPromises = existingPurchase.items.map(
        async (item) => {
          const { productId, quantity, frameTypeId, shapeTypeId, brandId } =
            item;

          // Update inventory to deduct the previously added stock
          const inventory = await db.inventory.findFirst({
            where: { productId, frameTypeId, shapeTypeId, brandId, companyId },
          });

          if (inventory) {
            return db.inventory.update({
              where: { id: inventory.id },
              data: { stock: { decrement: quantity } },
            });
          }
        }
      );

      await Promise.all(reverseInventoryPromises);

      // Process and add new items
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

        // Validate product
        const product = await db.product.findFirst({
          where: { id: productId, companyId },
        });

        if (!product) {
          throw new AppError(
            `Invalid product ID: ${productId} or product is not associated with the specified company`,
            400
          );
        }

        const totalItemAmount = rate * quantity;
        const discountAmount = totalItemAmount * (discount / 100);
        const amountAfterDiscount = totalItemAmount - discountAmount;

        let cgst = 0;
        let sgst = 0;
        let totalWithGST = amountAfterDiscount;

        // If GST is enabled, calculate CGST and SGST
        if (gstStatus) {
          cgst = amountAfterDiscount * 0.09; // Assuming 9% CGST
          sgst = amountAfterDiscount * 0.09; // Assuming 9% SGST
          totalWithGST = amountAfterDiscount + cgst + sgst;
        }

        totalAmount += totalItemAmount;
        totalCGST += cgst;
        totalSGST += sgst;
        netTotal += totalWithGST;

        updatedItems.push({
          productId,
          quantity,
          rate,
          discount,
          amount: amountAfterDiscount,
          cgst,
          sgst,
          modalNo: null,
          frameTypeId,
          shapeTypeId: shapeId,
          brandId,
        });
      }

      const roundOff = Math.round(netTotal) - netTotal;

      updateData.totalAmount = totalAmount;
      updateData.totalCGST = gstStatus ? totalCGST : 0;
      updateData.totalSGST = gstStatus ? totalSGST : 0;
      updateData.netTotal = netTotal + roundOff;
      updateData.items = {
        deleteMany: {}, // Remove existing items before updating
        create: updatedItems,
      };
    }

    // Perform update and inventory adjustment in a transaction
    const updatedPurchase = await db.$transaction(async (prisma) => {
      const purchase = await prisma.purchase.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: { items: true },
      });

      // Update inventory with new items
      const inventoryPromises = updatedItems.map(async (item) => {
        const { productId, quantity, frameTypeId, shapeTypeId, brandId } = item;

        const inventory = await prisma.inventory.findFirst({
          where: { productId, frameTypeId, shapeTypeId, brandId, companyId },
        });

        if (inventory) {
          // Increment the stock if inventory exists
          return prisma.inventory.update({
            where: { id: inventory.id },
            data: { stock: { increment: quantity } },
          });
        } else {
          // Create a new inventory record if it does not exist
          return prisma.inventory.create({
            data: {
              productId,
              frameTypeId,
              shapeTypeId,
              brandId,
              companyId,
              stock: quantity,
            },
          });
        }
      });

      await Promise.all(inventoryPromises);

      return purchase;
    });

    res.status(200).json({ success: true, data: updatedPurchase });
  } catch (error) {
    next(error);
  }
};

// Get all purchases with pagination and search
exports.getAllPurchases = async (req, res) => {
  let { companyId } = req.user; // Change `const` to `let`
  const { role } = req.user;
  const {
    page = 1,
    limit = 10,
    search = '',
    companyId: queryCompanyId,
  } = req.query;

  // If the role is SUPER_ADMIN, allow companyId from the query string
  if (role === 'SUPER_ADMIN') {
    // If no companyId is passed in the query, don't apply any filter for companyId
    companyId = parseInt(queryCompanyId, 10) || undefined;
  } else if (role !== 'SUPER_ADMIN' && !companyId) {
    // For other roles, ensure companyId exists in the token
    return res.status(400).json({
      status: 'error',
      message: 'Company ID is required to fetch invoices',
    });
  }

  // Parse pagination values with fallback defaults
  const pageNumber = Math.max(1, parseInt(page, 10) || 1); // Ensure page is at least 1
  const pageLimit = Math.max(1, parseInt(limit, 10) || 10); // Ensure limit is at least 1
  const skip = (pageNumber - 1) * pageLimit;

  console.log('Request Details:', {
    companyId,
    role,
    search,
    pageNumber,
    pageLimit,
  });

  // Determine the company filter based on the user's role
  let companyFilter = {};

  if (role === 'SUPER_ADMIN' && companyId) {
    // If SUPER_ADMIN and companyId is provided, apply filter
    companyFilter.companyId = companyId;
  } else if (role !== 'SUPER_ADMIN') {
    // For non-SUPER_ADMIN roles, apply companyId from token
    companyFilter.companyId = companyId;
  }

  try {
    console.log('Applying Company Filter:', companyFilter);

    // Fetch purchases and count in parallel
    const [purchases, totalPurchases] = await Promise.all([
      db.purchase.findMany({
        where: {
          ...companyFilter,
          OR: [
            { billNo: { contains: search, mode: 'insensitive' } }, // Case-insensitive search by billNo
            {
              items: {
                some: {
                  product: {
                    name: { contains: search, mode: 'insensitive' }, // Case-insensitive search by product name
                  },
                },
              },
            },
          ],
        },
        skip,
        take: pageLimit,
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
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      db.purchase.count({
        where: {
          ...companyFilter,
          OR: [
            { billNo: { contains: search, mode: 'insensitive' } },
            {
              items: {
                some: {
                  product: {
                    name: { contains: search, mode: 'insensitive' },
                  },
                },
              },
            },
          ],
        },
      }),
    ]);

    console.log('Purchases Fetched:', purchases.length);
    console.log('Total Purchases:', totalPurchases);

    // Respond with paginated data
    res.status(200).json({
      status: 'success',
      totalPurchases,
      totalPages: Math.ceil(totalPurchases / pageLimit),
      currentPage: pageNumber,
      purchases,
    });
  } catch (error) {
    console.error('Error Fetching Purchases:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Unable to retrieve purchases. Please try again later.',
    });
  }
};

// Get a specific purchase by ID
exports.getPurchaseById = async (req, res) => {
  const { id } = req.params;
  const { companyId, role } = req.user;

  try {
    const whereClause = { id: parseInt(id) };

    // Restrict access for SUBADMIN and MANAGER
    if (role === 'SUBADMIN' || role === 'MANAGER') {
      whereClause.companyId = companyId;
    }

    const purchase = await db.purchase.findUnique({
      where: whereClause,
      include: {
        items: {
          include: {
            product: true, // Include related Product details
            Brand: true, // Include related Brand details
            FrameType: true, // Include related FrameType details
            ShapeType: true, // Include related ShapeType details
          },
        },
        supplier: true, // Include related Supplier model
        Company: true, // Include related Company model
      },
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found or access denied',
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
