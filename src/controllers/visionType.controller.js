const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config');

// Create a new vision type
const createVisionType = async (req, res, next) => {
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
        // If no companyId is provided, SUPER_ADMIN can create the vision type for any company
        throw new AppError(
          'SUPER_ADMIN must provide a companyId when creating a vision type',
          400
        );
      }
    } else {
      // For non-SUPER_ADMIN users (like ADMIN), use the companyId from the token
      if (!userCompanyId) {
        throw new AppError(
          'No company associated with the user. Cannot create vision type.',
          400
        );
      }
      companyId = userCompanyId; // Use the companyId from the user's token for non-SUPER_ADMIN
    }

    // Check if either the code or name already exists for the given companyId
    const existingVisionType = await db.visionType.findFirst({
      where: {
        AND: [
          { companyId }, // Ensure the vision type is created for the correct company
          { OR: [{ code }, { name }] }, // Check for existing code or name
        ],
      },
    });

    if (existingVisionType) {
      if (existingVisionType.code === code) {
        throw new AppError('Vision code already exists for this company', 400);
      }
      if (existingVisionType.name === name) {
        throw new AppError('Vision name already exists for this company', 400);
      }
    }

    // Create new vision type
    const newVisionType = await db.visionType.create({
      data: { code, name, companyId }, // Use the selected or user-specific companyId
    });

    res.status(201).json(newVisionType);
  } catch (error) {
    console.error(error);
    next(error); // Pass the error to the global error handler
  }
};

// Get all vision types with pagination and search
const getAllVisionTypes = async (req, res) => {
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
    // Initialize the 'where' clause for filtering by vision type name
    let whereClause = {
      name: {
        contains: search, // Search by name
        // Prisma does not support `mode` for case insensitivity directly
        // You can filter results manually afterward if needed
      },
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

    // Fetch vision types based on the dynamically constructed whereClause
    const visionTypes = await db.visionType.findMany({
      where: whereClause,
      skip: (pageNumber - 1) * pageLimit,
      take: pageLimit,
    });

    // Get total vision types count for pagination
    const totalCount = await db.visionType.count({
      where: whereClause, // Use the same whereClause for counting
    });

    res.status(200).json({
      visionTypes,
      totalCount,
      totalPages: Math.ceil(totalCount / pageLimit),
      currentPage: pageNumber,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to retrieve vision types' });
  }
};

// Get a single vision type by ID
const getVisionTypeById = async (req, res) => {
  const { id } = req.params;

  try {
    const visionType = await db.visionType.findUnique({
      where: { id: parseInt(id) },
    });

    if (!visionType) {
      return res.status(404).json({ error: 'Vision type not found' });
    }

    res.status(200).json(visionType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to retrieve vision type' });
  }
};

// Update a vision type
const updateVisionType = async (req, res) => {
  const { id } = req.params;
  const { code, name } = req.body;

  try {
    const updatedVisionType = await db.visionType.update({
      where: { id: parseInt(id) },
      data: { code, name },
    });
    res.status(200).json(updatedVisionType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to update vision type' });
  }
};

// Delete a vision type
const deleteVisionType = async (req, res) => {
  const { id } = req.params;

  try {
    await db.visionType.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to delete vision type' });
  }
};

// Export the vision type controller functions
module.exports = {
  createVisionType,
  getAllVisionTypes,
  getVisionTypeById,
  updateVisionType,
  deleteVisionType,
};
