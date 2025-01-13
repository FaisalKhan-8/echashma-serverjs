const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config');

// Create a new coating type
const createCoatingType = async (req, res, next) => {
  const { code, name, companyId: selectedCompanyId } = req.body;
  const { companyId: userCompanyId, role } = req.user; // Extract companyId and role from the user's token

  try {
    let companyId;

    // If the user is SUPER_ADMIN, they can either pass a companyId or leave it out
    if (role === 'SUPER_ADMIN') {
      if (selectedCompanyId) {
        // If SUPER_ADMIN provides a companyId, use it
        companyId = selectedCompanyId;
      } else {
        // If no companyId is provided, allow them to create a coating type for any company
        throw new AppError(
          'SUPER_ADMIN must provide a companyId when creating a coating type',
          400
        );
      }
    } else {
      // For non-SUPER_ADMIN users (like ADMIN), use the companyId from the token
      if (!userCompanyId) {
        throw new AppError(
          'No company associated with the user. Cannot create coating type.',
          400
        );
      }
      companyId = userCompanyId; // Use the companyId from the user's token for non-SUPER_ADMIN
    }

    // Check if either the code or name already exists for the given company
    const existingCoating = await db.coatingType.findFirst({
      where: {
        AND: [
          { companyId }, // Ensure the coating type is created for the correct company
          { OR: [{ code }, { name }] }, // Check for existing code or name
        ],
      },
    });

    if (existingCoating) {
      if (existingCoating.code === code) {
        throw new AppError('Coating code already exists for this company', 400);
      }
      if (existingCoating.name === name) {
        throw new AppError('Coating name already exists for this company', 400);
      }
    }

    // Create new coating type if no conflict
    const newCoatingType = await db.coatingType.create({
      data: { code, name, companyId }, // Use the selected or user-specific companyId
    });

    res.status(201).json(newCoatingType);
  } catch (error) {
    console.error(error);
    next(error); // Pass the error to the global error handler
  }
};

// Get all coating types with pagination and search
const getAllCoatingTypes = async (req, res) => {
  const { companyId: userCompanyId, role } = req.user; // companyId and role from user token
  const {
    page = 1,
    limit = 10,
    search = '',
    companyId: queryCompanyId,
  } = req.query; // companyId and search from query params

  const skip = (page - 1) * limit;
  const take = parseInt(limit);

  try {
    let whereConditions = {
      name: {
        contains: search, // Search coating types by name
        // Add 'mode: 'insensitive'' for case insensitive search if using PostgreSQL
      },
    };

    if (role === 'SUPER_ADMIN') {
      // If the role is SUPER_ADMIN, use companyId from query if present
      if (queryCompanyId) {
        whereConditions.companyId = parseInt(queryCompanyId, 10); // Filter coating types by companyId from query
      }
    } else {
      // If the role is not SUPER_ADMIN, filter by companyId from user token
      whereConditions.companyId = userCompanyId; // Use the companyId from the user token
    }

    const coatingTypes = await db.coatingType.findMany({
      where: whereConditions,
      skip: skip,
      take: take,
    });

    // Get the total count of coating types for pagination
    const totalCount = await db.coatingType.count({
      where: whereConditions,
    });

    res.status(200).json({
      coatingTypes,
      totalCount,
      totalPages: Math.ceil(totalCount / take),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to retrieve coating types' });
  }
};

// Get a single coating type by ID
const getCoatingTypeById = async (req, res) => {
  const { id } = req.params;

  try {
    const coatingType = await db.coatingType.findUnique({
      where: { id: parseInt(id) },
    });

    if (!coatingType) {
      return res.status(404).json({ error: 'Coating type not found' });
    }

    res.status(200).json(coatingType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to retrieve coating type' });
  }
};

// Update a coating type
const updateCoatingType = async (req, res) => {
  const { id } = req.params;
  const { code, name } = req.body;

  try {
    const updatedCoatingType = await db.coatingType.update({
      where: { id: parseInt(id) },
      data: { code, name },
    });
    res.status(200).json(updatedCoatingType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to update coating type' });
  }
};

// Delete a coating type
const deleteCoatingType = async (req, res) => {
  const { id } = req.params;

  try {
    await db.coatingType.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to delete coating type' });
  }
};

// Export the coating type controller functions
module.exports = {
  createCoatingType,
  getAllCoatingTypes,
  getCoatingTypeById,
  updateCoatingType,
  deleteCoatingType,
};
