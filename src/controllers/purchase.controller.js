const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config');

exports.createPurchase = async (req, res, next) => {
  const { purchaseDate, billNo, supplierId, items, gstStatus } = req.body;
  const { companyId } = req.user; // Using companyId from the authenticated user

  console.log(req.body);

  try {
    if (!companyId) {
      throw new AppError('Invalid company. Please authenticate first.', 401)();
    }

    // Validate required fields
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

    // Check for existing purchase with the same billNo in the same company
    const existingPurchase = await db.purchase.findFirst({
      where: {
        billNo,
        companyId,
      },
    });
    if (existingPurchase) {
      throw new AppError(
        'Purchase with this Bill No already exists for this company',
        400
      );
    }

    // Validate supplier
    const supplier = await db.supplier.findFirst({
      where: { id: supplierId },
    });

    if (!supplier) {
      throw new AppError('Invalid supplier', 400);
    }

    let totalAmount = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let netTotal = 0;

    // Process purchase items
    const purchaseItemsData = [];
    for (const item of items) {
      const {
        productId,
        quantity,
        rate,
        discount = 0,
        modalNo = null,
        frameTypeId,
        shapeId, // Updated to match the payload key
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

      purchaseItemsData.push({
        productId,
        quantity,
        rate,
        discount,
        amount: amountAfterDiscount,
        cgst,
        sgst,
        modalNo: modalNo || null,
        frameTypeId,
        shapeTypeId: shapeId,
        brandId,
      });
    }

    // Round off the net total
    const roundOff = Math.round(netTotal) - netTotal;

    // Create purchase and purchase items in a transaction
    const newPurchase = await db.$transaction(async (prisma) => {
      const purchase = await prisma.purchase.create({
        data: {
          purchaseDate: new Date(purchaseDate),
          billNo,
          supplierId,
          companyId, // Include companyId here
          totalAmount,
          totalCGST: gstStatus ? totalCGST : 0, // Set CGST only if gstStatus is true
          totalSGST: gstStatus ? totalSGST : 0, // Set SGST only if gstStatus is true
          netTotal: netTotal + roundOff,
          items: {
            create: purchaseItemsData.map((item) => ({
              product: { connect: { id: item.productId } }, // Correctly reference the product relation
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
        include: {
          items: true, // Include related items
        },
      });

      // Prepare inventory updates
      const inventoryPromises = purchaseItemsData.map(async (item) => {
        const { productId, quantity, frameTypeId, shapeTypeId, brandId } = item;

        // Check if inventory exists
        const inventory = await prisma.inventory.findFirst({
          where: {
            productId,
            frameTypeId,
            shapeTypeId,
            brandId,
            companyId,
          },
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

      // Execute all inventory operations
      await Promise.all(inventoryPromises);

      return purchase;
    });

    // Return the newly created purchase
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
