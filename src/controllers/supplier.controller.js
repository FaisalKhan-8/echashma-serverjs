const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config');

// Create a new supplier
const createSupplier = async (req, res, next) => {
  const { role, companyId: userCompanyId } = req.user; // Extract companyId from the token (user's company)
  const { companyId: queryCompanyId } = req.query; // Extract companyId from query parameters

  console.log(queryCompanyId, 'queryCompanyId');

  // Destructure the supplier data from the request body
  const { code, name, address, contactPerson, contactNo, email, gstin, uin } =
    req.body;

  try {
    // Check if companyId is provided and handle SUPER_ADMIN case
    let companyId;
    if (role === 'SUPER_ADMIN') {
      // For SUPER_ADMIN, we expect the companyId to be in the query parameters
      companyId = parseInt(queryCompanyId, 10); // Convert to integer
    } else {
      // For other roles, we use the companyId from the user's token
      companyId = parseInt(userCompanyId, 10); // Convert to integer
    }

    // Log the companyId to check if it's properly populated
    console.log('CompanyId:', companyId);

    if (!companyId) {
      throw new AppError('Company ID is required', 400);
    }

    // Check if the supplier already exists based on unique fields like code, name, or gstin
    const existingSupplier = await db.supplier.findFirst({
      where: {
        OR: [
          { code }, // Add other fields that should be unique for the supplier
        ],
        companyId, // Ensure the supplier belongs to the correct company
      },
    });

    if (existingSupplier) {
      throw new AppError('Supplier already exists with the given details', 409); // Conflict
    }

    // Create a new supplier
    const newSupplier = await db.supplier.create({
      data: {
        code,
        name,
        address,
        contactPerson,
        contactNo,
        email,
        gstin,
        uin,
        companyId, // Associate the supplier with the company
      },
    });

    // Return the newly created supplier as a response
    res.status(201).json(newSupplier);
  } catch (error) {
    next(error); // Pass the error to the global error handler
    console.error(error);
  }
};

// Get all suppliers with pagination and search
const getAllSuppliers = async (req, res) => {
  const { role, companyId: userCompanyId } = req.user; // Get user role and companyId from the token
  const {
    page = 1,
    limit = 10,
    search = '',
    companyId: queryCompanyId,
  } = req.query; // Pagination and search params

  const pageNumber = parseInt(page);
  const pageLimit = parseInt(limit);

  try {
    // Initialize the where condition for search
    let whereCondition = {
      name: {
        contains: search, // Search by supplier name
      },
    };

    // If the user is not a SUPER_ADMIN, restrict suppliers to their companyId
    if (role !== 'SUPER_ADMIN') {
      if (!userCompanyId) {
        return res
          .status(400)
          .json({ error: 'No company associated with the user.' });
      }
      whereCondition.companyId = userCompanyId; // Only fetch suppliers for the user's company
    }

    // If SUPER_ADMIN and companyId is provided in the query, filter by companyId from the query
    if (role === 'SUPER_ADMIN') {
      // If companyId is provided in the query, use it, else don't filter by companyId
      if (queryCompanyId) {
        whereCondition.companyId = parseInt(queryCompanyId, 10) || undefined;
      }
      // If no companyId is provided, don't filter by companyId
    }

    // Debug log the where condition to see what's being sent
    console.log('Where Condition: ', whereCondition);

    // Fetch suppliers based on the dynamically constructed whereCondition
    const suppliers = await db.supplier.findMany({
      where: whereCondition,
      skip: (pageNumber - 1) * pageLimit,
      take: pageLimit,
    });

    // Get the total count of suppliers for pagination
    const totalSuppliers = await db.supplier.count({
      where: whereCondition,
    });

    res.status(200).json({
      totalSuppliers,
      totalPages: Math.ceil(totalSuppliers / pageLimit),
      currentPage: pageNumber,
      suppliers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to retrieve suppliers' });
  }
};

// Get a single supplier by ID
const getSupplierById = async (req, res) => {
  const { id } = req.params;

  try {
    const supplier = await db.supplier.findUnique({
      where: { id: parseInt(id) },
    });

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.status(200).json(supplier);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to retrieve supplier' });
  }
};

// Update a supplier
const updateSupplier = async (req, res) => {
  const { id } = req.params;
  const { code, name, address, contactPerson, contactNo, email, gstin, uin } =
    req.body;

  try {
    const updatedSupplier = await db.supplier.update({
      where: { id: parseInt(id) },
      data: {
        code,
        name,
        address,
        contactPerson,
        contactNo,
        email,
        gstin,
        uin,
      },
    });
    res.status(200).json(updatedSupplier);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to update supplier' });
  }
};

// Delete a supplier
const deleteSupplier = async (req, res) => {
  const { id } = req.params;
  const { role, companyId } = req.user;

  console.log(req.user, 'usersss');

  console.log(id, 'supplierId');

  try {
    await db.purchase.deleteMany({
      where: { supplierId: parseInt(id) },
    });

    await db.supplier.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send(); // No content to return after deletion
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to delete supplier' });
  }
};

// Export the supplier controller functions
module.exports = {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
};
