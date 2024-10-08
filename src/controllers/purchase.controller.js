const db = require('../utils/db.config');

// Create a new purchase with GST and discount calculations
exports.createPurchase = async (req, res) => {
  try {
    const { purchaseDate, billNo, supplierId, items } = req.body;

    // Validate required fields
    if (
      !purchaseDate ||
      !billNo ||
      !supplierId ||
      !items ||
      items.length === 0
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid input data' });
    }

    let totalAmount = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let netTotal = 0;

    // Calculate totals for each item
    const purchaseItemsData = items.map((item) => {
      const { quantity, rate, discount = 0 } = item;

      // Calculate total item amount, CGST, and SGST
      const totalItemAmount = rate * quantity;
      const discountAmount = totalItemAmount * (discount / 100);
      const amountAfterDiscount = totalItemAmount - discountAmount;

      // Assume CGST and SGST are 9% each for example
      const cgst = amountAfterDiscount * 0.09;
      const sgst = amountAfterDiscount * 0.09;
      const totalWithGST = amountAfterDiscount + cgst + sgst;

      // Update totals
      totalAmount += totalItemAmount;
      totalCGST += cgst;
      totalSGST += sgst;
      netTotal += totalWithGST;

      return {
        productId: item.productId,
        quantity,
        rate,
        amount: amountAfterDiscount, // Store the amount after discount
        cgst,
        sgst,
      };
    });

    const roundOff = Math.round(netTotal) - netTotal; // Round-off calculation

    // Create the purchase record in the database
    const purchase = await db.purchase.create({
      data: {
        purchaseDate: new Date(purchaseDate),
        billNo,
        supplierId,
        totalAmount,
        totalCGST,
        totalSGST,
        netTotal: netTotal + roundOff, // Store the rounded total
        items: {
          create: purchaseItemsData.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
            cgst: item.cgst,
            sgst: item.sgst,
          })),
        },
      },
      include: { items: true }, // Include items in the response
    });

    res.status(201).json({ success: true, data: purchase });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Update a purchase with GST and discount calculations
exports.updatePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const { purchaseDate, billNo, supplierId, items } = req.body;

    // Calculate totals for each item
    let totalAmount = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let netTotal = 0;

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
        amount: amountAfterDiscount,
        cgst,
        sgst,
      };
    });

    const roundOff = Math.round(netTotal) - netTotal;

    // Update the purchase record in the database
    const purchase = await db.purchase.update({
      where: { id: parseInt(id) },
      data: {
        purchaseDate: new Date(purchaseDate),
        billNo,
        supplierId,
        totalAmount,
        totalCGST,
        totalSGST,
        netTotal: netTotal + roundOff,
        items: {
          deleteMany: {}, // Remove existing items before updating
          create: purchaseItemsData.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
            cgst: item.cgst,
            sgst: item.sgst,
          })),
        },
      },
      include: { items: true },
    });

    res.status(200).json({ success: true, data: purchase });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get all purchases
exports.getAllPurchases = async (req, res) => {
  try {
    const purchases = await db.purchase.findMany({
      include: { items: true }, // Include purchase items in the response
    });

    res.status(200).json({ success: true, data: purchases });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get a specific purchase by ID
exports.getPurchaseById = async (req, res) => {
  try {
    const { id } = req.params;
    const purchase = await db.purchase.findUnique({
      where: { id: parseInt(id) },
      include: { items: true },
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
  try {
    const { id } = req.params;

    const purchase = await db.purchase.delete({
      where: { id: parseInt(id) },
      include: { items: true },
    });

    if (!purchase) {
      return res
        .status(404)
        .json({ success: false, message: 'Purchase not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Purchase deleted successfully',
      data: purchase,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
