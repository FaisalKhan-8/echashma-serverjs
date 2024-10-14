const db = require('../utils/db.config')

const calculatePriceDetails = (rate, quantity, discount = 0) => {
  const totalItemAmount = rate * quantity // Calculate total amount for the item (rate * quantity)
  const discountAmount = (totalItemAmount * discount) / 100 // Discount in percentage
  const amountAfterDiscount = totalItemAmount - discountAmount // Amount after applying discount

  // Assuming CGST and SGST are 9% each (can be customized based on your needs)
  const cgst = amountAfterDiscount * 0.09
  const sgst = amountAfterDiscount * 0.09
  const totalWithGST = amountAfterDiscount + cgst + sgst // Final total after applying taxes

  return {
    totalItemAmount,
    discountAmount,
    amountAfterDiscount,
    cgst,
    sgst,
    totalWithGST,
  }
}

// Create a new purchase with GST and discount calculations
exports.createPurchase = async (req, res) => {
  try {
    const { purchaseDate, billNo, supplierId, items } = req.body

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
        .json({ success: false, message: 'Invalid input data' })
    }

    let totalAmount = 0
    let totalCGST = 0
    let totalSGST = 0
    let netTotal = 0

    // Calculate totals for each item
    const purchaseItemsData = items.map((item) => {
      const { quantity, rate, discount = 0 } = item

      // Calculate total item amount, CGST, and SGST
      const totalItemAmount = rate * quantity
      const discountAmount = totalItemAmount * (discount / 100)
      const amountAfterDiscount = totalItemAmount - discountAmount

      // Assume CGST and SGST are 9% each for example
      const cgst = amountAfterDiscount * 0.09
      const sgst = amountAfterDiscount * 0.09
      const totalWithGST = amountAfterDiscount + cgst + sgst

      // Update totals
      totalAmount += totalItemAmount
      totalCGST += cgst
      totalSGST += sgst
      netTotal += totalWithGST

      return {
        productId: item.productId,
        quantity,
        rate,
        amount: amountAfterDiscount, // Store the amount after discount
        cgst,
        sgst,
      }
    })

    const roundOff = Math.round(netTotal) - netTotal // Round-off calculation

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
    })

    res.status(201).json({ success: true, data: purchase })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

// Update a purchase with GST and discount calculations
exports.updatePurchase = async (req, res) => {
  try {
    const { id } = req.params // Extract purchase ID from the URL parameters
    const { purchaseDate, billNo, supplierId, items } = req.body // Extract necessary fields from the request body

    // Build the update data object dynamically
    const updateData = {}

    // Conditionally add each field if it is present in the request
    if (purchaseDate) {
      updateData.purchaseDate = new Date(purchaseDate) // Convert purchaseDate to Date object
    }
    if (billNo) {
      updateData.billNo = billNo
    }
    if (supplierId) {
      updateData.supplierId = supplierId
    }

    let totalAmount = 0
    let totalCGST = 0
    let totalSGST = 0
    let netTotal = 0

    if (Array.isArray(items) && items.length > 0) {
      const purchaseItemsData = items.map((item) => {
        const {
          totalItemAmount,
          discountAmount,
          amountAfterDiscount,
          cgst,
          sgst,
          totalWithGST,
        } = calculatePriceDetails(item.rate, item.quantity, item.discount)

        totalAmount += totalItemAmount
        totalCGST += cgst
        totalSGST += sgst
        netTotal += totalWithGST

        return {
          productId: item.productId,
          quantity: item.quantity,
          rate: item.rate,
          amount: amountAfterDiscount,
          cgst,
          sgst,
        }
      })

      const roundOff = Math.round(netTotal) - netTotal
      updateData.totalAmount = totalAmount
      updateData.totalCGST = totalCGST
      updateData.totalSGST = totalSGST
      updateData.netTotal = netTotal + roundOff
      updateData.items = {
        deleteMany: {}, // Remove existing items before updating
        create: purchaseItemsData, // Add new items
      }
    }

    // Update the purchase record in the database
    const purchase = await db.purchase.update({
      where: { id: parseInt(id) }, // Ensure ID is parsed as an integer
      data: updateData,
      include: { items: true }, // Include items in the response
    })

    res.status(200).json({ success: true, data: purchase }) // Send the updated purchase data
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: 'Internal server error' }) // Generic error message
  }
}

// Get all purchases
exports.getAllPurchases = async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query // Extract page, limit, and search from query parameters

  const skip = (page - 1) * limit // Calculate how many records to skip
  const take = parseInt(limit) // Limit of records per page

  try {
    // Perform search query
    const purchases = await db.purchase.findMany({
      skip, // <-- Add skip here
      take, // <-- Add take here
      where: {
        OR: [
          {
            items: {
              some: {
                Product: {
                  name: {
                    contains: search, // Search by product name
                  },
                },
              },
            },
          },
          {
            items: {
              some: {
                Product: {
                  suppliers: {
                    some: {
                      name: {
                        contains: search, // Search by supplier name
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
      include: {
        items: {
          include: {
            Product: {
              include: {
                suppliers: true, // Include the suppliers for each product
              },
            },
          },
        },
      },
    })

    // Get total count for pagination purposes
    const totalPurchases = await db.purchase.count({
      where: {
        OR: [
          {
            items: {
              some: {
                Product: {
                  name: {
                    contains: search,
                  },
                },
              },
            },
          },
          {
            items: {
              some: {
                Product: {
                  suppliers: {
                    some: {
                      name: {
                        contains: search,
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    })

    res.status(200).json({
      success: true,
      data: purchases,
      pagination: {
        total: totalPurchases,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalPurchases / limit),
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

// Get a specific purchase by ID
exports.getPurchaseById = async (req, res) => {
  try {
    const { id } = req.params
    const purchase = await db.purchase.findUnique({
      where: { id: parseInt(id) },
      include: {
        items: {
          include: {
            Product: true, // Include the product details for each purchase item
          },
        },
      },
    })

    if (!purchase) {
      return res
        .status(404)
        .json({ success: false, message: 'Purchase not found' })
    }

    res.status(200).json({ success: true, data: purchase })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

// Delete a specific purchase by ID
exports.deletePurchase = async (req, res) => {
  const { purchaseId } = req.params

  if (!purchaseId) {
    return res.status(400).json({ error: 'Purchase ID is required' })
  }

  try {
    // Check if the purchase exists
    const purchaseExists = await db.purchase.findUnique({
      where: {
        id: parseInt(purchaseId),
      },
    })

    if (!purchaseExists) {
      return res.status(404).json({ error: 'Purchase not found' })
    }

    // Delete related items
    const deletedItems = await db.purchaseItem.deleteMany({
      where: {
        purchaseId: parseInt(purchaseId), // Corrected this line
      },
    })

    // Delete the purchase
    const deletedPurchase = await db.purchase.delete({
      where: { id: parseInt(purchaseId) },
    })

    console.log('Purchase and related items deleted successfully:', {
      deletedItems,
      deletedPurchase,
    })
    res.json({ message: 'Purchase deleted successfully', deletedPurchase })
  } catch (error) {
    console.error('Error deleting purchase:', error)
    res
      .status(500)
      .json({ error: 'An error occurred while deleting the purchase' })
  }
}
