const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config');

// Create a new coating type
const createBrand = async (req, res, next) => {
  const { code, name } = req.body;
  const { companyId: userCompanyId, role } = req.user; // Extract user-specific companyId from the token
  const { companyId: selectedCompanyId } = req.query;

  console.log(selectedCompanyId, 'selectedCompanyId');

  try {
    let companyId;

    // If the user is SUPER_ADMIN, they can either pass a companyId or leave it out
    if (role === 'SUPER_ADMIN') {
      if (selectedCompanyId) {
        // If SUPER_ADMIN passes a companyId in the request, use that
        companyId = parseInt(selectedCompanyId, 10);
      } else {
        // If no companyId is provided by SUPER_ADMIN, allow them to create a brand without it (they can pick any company)
        throw new AppError(
          'SUPER_ADMIN must provide a companyId when creating a brand if no company is selected',
          400
        );
      }
    } else {
      // For non-SUPER_ADMIN users (like ADMIN), use the companyId from the token
      if (!userCompanyId) {
        throw new AppError(
          'No company associated with the user. Cannot create brand.',
          400
        );
      }
      companyId = userCompanyId; // Use the companyId from the user's token for non-SUPER_ADMIN
    }

    // Check if either the code or name already exists for the given company
    const existingBrand = await db.brands.findFirst({
      where: {
        AND: [
          { companyId }, // Ensure the brand is created for the correct company
          { OR: [{ code }, { name }] }, // Check for existing code or name
        ],
      },
    });

    if (existingBrand) {
      if (existingBrand.code === code) {
        throw new AppError('Brand code already exists for this company', 400);
      }
      if (existingBrand.name === name) {
        throw new AppError('Brand name already exists for this company', 400);
      }
    }

    // Create new brand if no conflict
    const newBrand = await db.brands.create({
      data: { code, name, companyId }, // Use the selected or user-specific companyId
    });

    res.status(201).json(newBrand);
  } catch (error) {
    console.error(error);
    next(error); // Pass the error to the global error handler
  }
};

// Get all coating types with pagination and search
const getAllBrand = async (req, res) => {
  const { companyId: userCompanyId, role } = req.user; // companyId from user token and role from user token
  const {
    page = 1,
    limit = 10,
    search = '',
    companyId: queryCompanyId,
  } = req.query; // companyId from query params

  const skip = (page - 1) * limit;
  const take = parseInt(limit);

  try {
    // Initialize whereClause
    let whereClause = {
      OR: [
        {
          code: {
            contains: search, // Search by code
          },
        },
        {
          name: {
            contains: search, // Search by name
          },
        },
      ],
    };

    if (role === 'SUPER_ADMIN') {
      // If the role is SUPER_ADMIN, use companyId from query if present
      if (queryCompanyId) {
        whereClause.companyId = parseInt(queryCompanyId, 10) || undefined; // Filter brands by companyId from query
      }
    } else {
      // If the role is not SUPER_ADMIN, filter by companyId from user token
      whereClause.companyId = parseInt(userCompanyId, 10); // Use the companyId from the user token
    }

    // Fetch brands with pagination and filters
    const Brands = await db.brands.findMany({
      where: whereClause,
      skip: skip,
      take: take,
    });

    // Get the total count of brands for pagination
    const totalCount = await db.brands.count({
      where: whereClause,
    });

    res.status(200).json({
      Brands,
      totalCount,
      totalPages: Math.ceil(totalCount / take),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to retrieve Brands' });
  }
};

// Get a single coating type by ID
const getBrandById = async (req, res) => {
  const { id } = req.params;

  try {
    const Brand = await db.brands.findUnique({
      where: { id: parseInt(id) },
    });

    if (!Brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    res.status(200).json(Brand);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to retrieve Brand' });
  }
};

// Update a coating type
const updateBrand = async (req, res, next) => {
  const { id } = req.params;
  const { code, name } = req.body;
  try {
    // Proceed with the update if no conflict
    const updatedBrand = await db.brands.update({
      where: { id: parseInt(id) },
      data: { code, name },
    });

    res.status(200).json(updatedBrand);
  } catch (error) {
    console.error(error);
    next(error);
  }
};

// Delete a coating type
const deleteBrand = async (req, res) => {
  const { id } = req.params;

  try {
    await db.brands.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to delete Brand' });
  }
};

// Export the coating type controller functions
module.exports = {
  createBrand,
  getAllBrand,
  getBrandById,
  updateBrand,
  deleteBrand,
};
