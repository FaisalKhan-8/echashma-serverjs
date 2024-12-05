const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config');

const calculatePriceDetails = (rate, quantity, discount = 0) => {
  const totalItemAmount = rate * quantity; // Calculate total amount for the item (rate * quantity)
  const discountAmount = (totalItemAmount * discount) / 100; // Discount in percentage
  const amountAfterDiscount = totalItemAmount - discountAmount; // Amount after applying discount

  // Assuming CGST and SGST are 9% each (can be customized based on your needs)
  const cgst = amountAfterDiscount * 0.09;
  const sgst = amountAfterDiscount * 0.09;
  const totalWithGST = amountAfterDiscount + cgst + sgst; // Final total after applying taxes

  return {
    totalItemAmount,
    discountAmount,
    amountAfterDiscount,
    cgst,
    sgst,
    totalWithGST,
  };
};

// Create a new purchase with GST and discount calculations
exports.createPurchase = async (req, res, next) => {
  const { purchaseDate, billNo, supplierId, items } = req.body;
  const { userId } = req.user;

  console.log('Request Body:', req.body);

  try {
    // Retrieve the branches associated with the user from req.user
    const userBranches = req.user.branches;

    if (!userBranches || userBranches.length === 0) {
      return new AppError(
        'User does not have any branches associated with them. Please assign branches to your user.',
        403
      );
    }

    // Assuming you want to use the first branch associated with the user
    const branch = userBranches[0]; // Adjust this logic if a user has multiple branches and needs a specific one

    const branchId = branch.id;
    console.log('Branch ID:', branchId);

    // Validate required fields
    if (
      !purchaseDate ||
      !billNo ||
      !supplierId ||
      !branchId ||
      !items ||
      items.length === 0
    ) {
      return res.status(400).json({
        error: 'Invalid input data. Please provide all required fields.',
      });
    }

    // Continue with purchase creation using the branchId
    const existingPurchase = await db.purchase.findFirst({
      where: { billNo, branchId },
    });

    if (existingPurchase) {
      return res.status(400).json({
        error: 'Purchase with this Bill No already exists for this branch',
      });
    }

    const supplier = await db.supplier.findFirst({
      where: { id: supplierId, branchId },
    });

    if (!supplier) {
      return res.status(400).json({
        error:
          'Invalid supplier ID or supplier is not associated with the specified branch',
      });
    }

    let totalAmount = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let netTotal = 0;

    const purchaseItemsData = await Promise.all(
      items.map(async (item) => {
        const { productId, quantity, rate, discount = 0 } = item;

        const product = await db.product.findFirst({
          where: { id: productId, branchId },
        });

        if (!product) {
          throw new Error(
            `Invalid product ID: ${productId} or product is not associated with the specified branch`
          );
        }

        const totalItemAmount = rate * quantity;
        const discountAmount = totalItemAmount * (discount / 100);
        const amountAfterDiscount = totalItemAmount - discountAmount;
        const cgst = amountAfterDiscount * 0.09;
        const sgst = amountAfterDiscount * 0.09;
        const totalWithGST = amountAfterDiscount + cgst + sgst;

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
        };
      })
    );

    const roundOff = Math.round(netTotal) - netTotal;

    const newPurchase = await db.purchase.create({
      data: {
        userId,
        branchId,
        purchaseDate: new Date(purchaseDate),
        billNo,
        supplierId,
        totalAmount,
        totalCGST,
        totalSGST,
        netTotal: netTotal + roundOff,
        items: {
          create: purchaseItemsData.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            rate: item.rate,
            discount: item.discount,
            amount: item.amount,
            cgst: item.cgst,
            sgst: item.sgst,
          })),
        },
      },
      include: { items: true },
    });

    res.status(201).json({ success: true, data: newPurchase });
  } catch (error) {
    next(new Error(error));
    res
      .status(500)
      .json({ error: error.message || 'Unable to create purchase' });
  }
};

// Update a purchase with GST and discount calculations
exports.updatePurchase = async (req, res) => {
  try {
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
          totalItemAmount,
          discountAmount,
          amountAfterDiscount,
          cgst,
          sgst,
          totalWithGST,
        } = calculatePriceDetails(item.rate, item.quantity, item.discount);

        totalAmount += totalItemAmount;
        totalCGST += cgst;
        totalSGST += sgst;
        netTotal += totalWithGST;

        return {
          productId: item.productId,
          quantity: item.quantity,
          rate: item.rate,
          discount: item.discount, // Update discount
          amount: amountAfterDiscount,
          cgst,
          sgst,
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

    // Update the purchase record in the database
    const purchase = await db.purchase.update({
      where: { id: parseInt(id) }, // Ensure ID is parsed as an integer
      data: updateData,
      include: { items: true }, // Include items in the response
    });

    res.status(200).json({ success: true, data: purchase }); // Send the updated purchase data
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' }); // Generic error message
  }
};

// Get all purchases
exports.getAllPurchases = async (req, res) => {
  const { userId } = req.user; // Get userId from the authenticated user
  const { page = 1, limit = 10, search = '' } = req.query;

  const pageNumber = parseInt(page);
  const pageLimit = parseInt(limit);
  const skip = (pageNumber - 1) * pageLimit;

  try {
    // Fetch purchases with pagination and search
    const purchases = await db.purchase.findMany({
      where: {
        userId, // Filter purchases for the authenticated user
        OR: [
          {
            billNo: {
              contains: search, // Search by bill number
              mode: 'insensitive', // Case-insensitive search
            },
          },
          {
            items: {
              some: {
                Product: {
                  name: {
                    contains: search, // Search by product name
                    mode: 'insensitive',
                  },
                },
              },
            },
          },
          {
            Branch: {
              branchName: {
                contains: search, // Search by branch name
                mode: 'insensitive',
              },
            },
          },
        ],
      },
      skip, // Skip records for pagination
      take: pageLimit, // Limit the number of records returned
      include: {
        Branch: true, // Include branch details
        items: {
          include: {
            Product: true, // Include product details for each item
          },
        },
        supplier: true, // Include supplier details
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          }, // Include limited user details
        },
      },
      orderBy: {
        createdAt: 'desc', // Order purchases by most recent
      },
    });

    // Count total purchases for pagination
    const totalPurchases = await db.purchase.count({
      where: {
        userId, // Count only the user's purchases
        OR: [
          {
            billNo: {
              contains: search, // Count matching by bill number
              mode: 'insensitive',
            },
          },
          {
            items: {
              some: {
                Product: {
                  name: {
                    contains: search, // Count matching by product name
                    mode: 'insensitive',
                  },
                },
              },
            },
          },
          {
            Branch: {
              branchName: {
                contains: search, // Count matching by branch name
                mode: 'insensitive',
              },
            },
          },
        ],
      },
    });

    res.status(200).json({
      totalPurchases,
      totalPages: Math.ceil(totalPurchases / pageLimit),
      currentPage: pageNumber,
      purchases,
    });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ error: 'Unable to retrieve purchases' });
  }
};

// Get a specific purchase by ID
exports.getPurchaseById = async (req, res) => {
  try {
    const { id } = req.params;
    const purchase = await db.purchase.findUnique({
      where: { id: parseInt(id) },
      include: {
        items: {
          include: {
            Product: true, // Include the product details for each purchase item
          },
        },
      },
    });

    if (!purchase) {
      return res
        .status(404)
        .json({ success: false, message: 'Purchase not found' });
    }

    res.status(200).json({ success: true, data: purchase });
  } catch (error) {
    console.error(error);
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
      where: {
        id: parseInt(purchaseId),
      },
    });

    if (!purchaseExists) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    // Delete related items
    const deletedItems = await db.purchaseItem.deleteMany({
      where: {
        purchaseId: parseInt(purchaseId), // Corrected this line
      },
    });

    // Delete the purchase
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
