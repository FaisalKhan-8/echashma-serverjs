const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config');

// Create a new shape type
const createShapeType = async (req, res, next) => {
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
        // If no companyId is provided, SUPER_ADMIN can create the shape type for any company
        throw new AppError(
          'SUPER_ADMIN must provide a companyId when creating a shape type',
          400
        );
      }
    } else {
      // For non-SUPER_ADMIN users (like ADMIN), use the companyId from the token
      if (!userCompanyId) {
        throw new AppError(
          'No company associated with the user. Cannot create shape type.',
          400
        );
      }
      companyId = userCompanyId; // Use the companyId from the user's token for non-SUPER_ADMIN
    }

    // Check if either the code or name already exists for the given companyId
    const existingShapeType = await db.shapeType.findFirst({
      where: {
        AND: [
          { companyId }, // Ensure the shape type is created for the correct company
          { OR: [{ code }, { name }] }, // Check for existing code or name
        ],
      },
    });

    if (existingShapeType) {
      if (existingShapeType.code === code) {
        throw new AppError('Shape code already exists.', 400);
      }
      if (existingShapeType.name === name) {
        throw new AppError('Shape name already exists.', 400);
      }
    }

    // Create new shape type
    const newShapeType = await db.shapeType.create({
      data: { code, name, companyId }, // Use the selected or user-specific companyId
    });

    res.status(201).json(newShapeType);
  } catch (error) {
    console.error(error);
    next(error);
  }
};

// Get all shape types with pagination and search
const getAllShapeTypes = async (req, res) => {
  const { userId, companyId: userCompanyId, role } = req.user; // Get userId, companyId, and role from the authenticated user
  const {
    page = 1,
    limit = 10,
    search = '',
    companyId: queryCompanyId,
  } = req.query; // Extract query params
  const pageNumber = parseInt(page);
  const pageLimit = parseInt(limit);

  try {
    // Initialize the 'where' clause for filtering by shape type code or name
    let whereClause = {
      OR: [
        {
          code: {
            contains: search, // Search by code
            // Prisma does not support `mode` for case insensitivity directly
            // You can filter results manually afterward if needed
          },
        },
        {
          name: {
            contains: search, // Search by name
            // Prisma does not support `mode` for case insensitivity directly
            // You can filter results manually afterward if needed
          },
        },
      ],
    };

    // If the user is a SUPER_ADMIN, allow filtering by companyId from the query
    if (role === 'SUPER_ADMIN') {
      if (queryCompanyId) {
        whereClause.companyId = parseInt(queryCompanyId, 10); // Filter by companyId from query if provided
      }
    } else {
      // For non-SUPER_ADMIN roles, restrict access to the user's companyId
      if (!userCompanyId) {
        throw new Error('No company associated with the user.');
      }
      whereClause.companyId = userCompanyId; // Filter by the user's companyId from token
    }

    // Fetch shape types based on the dynamically constructed whereClause
    const shapeTypes = await db.shapeType.findMany({
      where: whereClause,
      skip: (pageNumber - 1) * pageLimit,
      take: pageLimit,
    });

    // Get total shape types count for pagination
    const totalCount = await db.shapeType.count({
      where: whereClause, // Use the same whereClause for counting
    });

    res.status(200).json({
      shapeTypes,
      totalCount,
      totalPages: Math.ceil(totalCount / pageLimit),
      currentPage: pageNumber,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to retrieve shape types' });
  }
};

// Get a single shape type by ID
const getShapeTypeById = async (req, res) => {
  const { id } = req.params;

  try {
    const shapeType = await db.shapeType.findUnique({
      where: { id: parseInt(id) },
    });

    if (!shapeType) {
      return res.status(404).json({ error: 'Shape type not found' });
    }

    res.status(200).json(shapeType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to retrieve shape type' });
  }
};

// Update a shape type
const updateShapeType = async (req, res) => {
  const { id } = req.params;
  const { code, name } = req.body;

  try {
    const updatedShapeType = await db.shapeType.update({
      where: { id: parseInt(id) },
      data: { code, name },
    });
    res.status(200).json(updatedShapeType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to update shape type' });
  }
};

// Delete a shape type
const deleteShapeType = async (req, res) => {
  const { id } = req.params;

  try {
    await db.shapeType.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to delete shape type' });
  }
};

// Export the shape type controller functions
module.exports = {
  createShapeType,
  getAllShapeTypes,
  getShapeTypeById,
  updateShapeType,
  deleteShapeType,
};
