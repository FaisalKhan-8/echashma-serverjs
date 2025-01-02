const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config');

exports.createPurchase = async (req, res, next) => {
  const { purchaseDate, billNo, supplierId, items, gstStatus } = req.body;
  const { companyId } = req.user; // Using companyId from the authenticated user

  console.log(req.body);

  try {
    // Validate required fields
    if (
      !purchaseDate ||
      !billNo ||
      !supplierId ||
      !companyId || // Ensure companyId is validated
      !items ||
      items.length === 0
    ) {
      return next(
        new AppError(
          'Invalid input data. Please provide all required fields.',
          400
        )
      );
    }

    // Check for existing purchase with the same billNo in the same company
    const existingPurchase = await db.purchase.findFirst({
      where: { billNo, companyId },
    });

    if (existingPurchase) {
      return next(
        new AppError(
          'Purchase with this Bill No already exists for this company',
          400
        )
      );
    }

    // Validate supplier
    const supplier = await db.supplier.findFirst({
      where: { id: supplierId },
    });

    if (!supplier) {
      return next(new AppError('Invalid supplier', 400));
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
        return next(
          new AppError(
            `Invalid product ID: ${productId} or product is not associated with the specified company`,
            400
          )
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
        shapeTypeId: shapeId || null, // Adjusted for shapeId
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
              frameTypeId: item.frameTypeId,
              shapeTypeId: item.shapeTypeId,
              brandId: item.brandId,
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
    return next(
      new AppError(error.message || 'Unable to create purchase', 400)
    );
  }
};

// Update a purchase with GST and discount calculations
// Update Purchase
exports.updatePurchase = async (req, res) => {
  const { id } = req.params; // Extract purchase ID from the URL parameters
  const { purchaseDate, billNo, supplierId, items } = req.body; // Extract necessary fields from the request body

  // Build the update data object dynamically
  const updateData = {};

  // Conditionally add each field if it is present in the request
  if (purchaseDate) {
    updateData.purchaseDate = new Date(purchaseDate);
  }
  if (billNo) {
    updateData.billNo = billNo;
  }
  if (supplierId) {
    updateData.supplierId = supplierId;
  }

  let totalAmount = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let netTotal = 0;

  if (Array.isArray(items) && items.length > 0) {
    const purchaseItemsData = items.map((item) => {
      const {
        productId,
        quantity,
        rate,
        discount = 0,
        modalNo,
        frameTypeId,
        shapeId,
        brandId,
      } = item;

      // Calculate price details
      const {
        totalItemAmount,
        discountAmount,
        amountAfterDiscount,
        cgst,
        sgst,
        totalWithGST,
      } = calculatePriceDetails(rate, quantity, discount);

      totalAmount += totalItemAmount;
      totalCGST += cgst;
      totalSGST += sgst;
      netTotal += totalWithGST;

      return {
        productId,
        quantity,
        rate,
        discount,
        amount: amountAfterDiscount,
        cgst,
        sgst,
        modalNo,
        frameTypeId,
        shapeId,
        brandId,
      };
    });

    const roundOff = Math.round(netTotal) - netTotal;
    updateData.totalAmount = totalAmount;
    updateData.totalCGST = totalCGST;
    updateData.totalSGST = totalSGST;
    updateData.netTotal = netTotal + roundOff;
    updateData.items = {
      deleteMany: {}, // Remove existing items before updating
      create: purchaseItemsData, // Add new items
    };
  }

  try {
    // Start transaction to ensure atomicity for delete and update operations
    const purchase = await db.$transaction(async (prisma) => {
      // Update the purchase record
      const updatedPurchase = await prisma.purchase.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: { items: true },
      });

      return updatedPurchase;
    });

    res.status(200).json({ success: true, data: purchase }); // Send the updated purchase data
  } catch (error) {
    console.error('Error updating purchase:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get all purchases with pagination and search
exports.getAllPurchases = async (req, res) => {
  const { companyId, role } = req.user; // Extract companyId and role from the authenticated user
  const { page = 1, limit = 10, search = '' } = req.query;

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

  if (role === 'ADMIN') {
    // Admin can view all purchases, no companyId filter needed
    companyFilter = {};
  } else if (role === 'SUBADMIN' || role === 'MANAGER') {
    if (!companyId) {
      // Ensure companyId exists for SUBADMIN and MANAGER
      return res.status(400).json({
        status: 'error',
        message: 'Company ID is required to fetch invoices',
      });
    }
    companyFilter = { companyId }; // Restrict to the user's companyId
  } else {
    // Return error for unknown or unauthorized roles
    return res.status(403).json({
      status: 'error',
      message: 'You do not have permission to view purchases',
    });
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
                  Product: {
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
              Product: true, // Include related Product model
              Brand: true, // Include related Brand model
              FrameType: true, // Include related FrameType model
              ShapeType: true, // Include related ShapeType model
            },
          },
          supplier: true, // Include related Supplier model
          Company: true, // Include related Company model
        },
        orderBy: {
          createdAt: 'desc', // Order by most recent first
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
                  Product: {
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
            Product: true, // Include related Product details
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
