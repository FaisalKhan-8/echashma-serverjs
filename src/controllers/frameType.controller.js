const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config');

// Create a new frame type

const createFrameType = async (req, res, next) => {
  const { code, name } = req.body;
  const { companyId: userCompanyId, role } = req.user;
  const { companyId: selectedCompanyId } = req.query; // Extract companyId and role from the user's token

  try {
    let companyId;

    // If the user is SUPER_ADMIN, they can either pass a companyId or leave it out
    if (role === 'SUPER_ADMIN') {
      if (selectedCompanyId) {
        companyId = parseInt(selectedCompanyId, 10);
      } else {
        throw new AppError(
          'SUPER_ADMIN must provide a companyId when creating a frame type',
          400
        );
      }
    } else {
      // For non-SUPER_ADMIN users (like ADMIN), use the companyId from the token
      if (!userCompanyId) {
        throw new AppError(
          'No company associated with the user. Cannot create frame type.',
          400
        );
      }
      companyId = userCompanyId;
    }

    // Check if the frame type with the same code already exists for the given companyId
    const existingFrameType = await db.frameType.findFirst({
      where: {
        AND: [
          { companyId }, // Ensure the frame type is created for the correct company
          { OR: [{ code }, { name }] }, // Check for existing code or name
        ],
      },
    });

    // If found, throw appropriate error based on whether code or name already exists
    if (existingFrameType) {
      if (existingFrameType.code === code) {
        throw new AppError('Frame code already exists.', 400);
      }
      if (existingFrameType.name === name) {
        throw new AppError('Frame name already exists.', 400);
      }
    }

    // Proceed to create the new frame type
    const newFrameType = await db.frameType.create({
      data: { code, name, companyId }, // Use the selected or user-specific companyId
    });

    // Return the newly created frame type
    res.status(201).json(newFrameType);
  } catch (error) {
    next(error);
  }
};

// Get all frame types
const getAllFrameTypes = async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    companyId: queryCompanyId,
  } = req.query; // Extract from query parameters
  const { companyId: userCompanyId, role } = req.user; // Extract user role and companyId from token

  const skip = (page - 1) * limit;
  const take = parseInt(limit);

  try {
    // Define where condition based on role
    let whereCondition = {
      AND: [
        {
          code: {
            contains: search ? search.toLowerCase() : '',
            // Prisma does not support `mode` directly for case-insensitive search
            // We handle the case-insensitive manually by transforming search term to lowercase
          },
        },
        {
          name: {
            contains: search ? search.toLowerCase() : '',
          },
        },
      ],
    };

    if (role === 'SUPER_ADMIN') {
      // If the user is SUPER_ADMIN, use companyId from the query if provided
      if (queryCompanyId) {
        whereCondition.companyId = parseInt(queryCompanyId, 10) || undefined; // Apply companyId filter from query
      }
    } else {
      // For non-SUPER_ADMIN roles, restrict results to the user's companyId
      if (!userCompanyId) {
        throw new Error('No company associated with the user.');
      }
      whereCondition.companyId = userCompanyId; // Apply companyId filter from user token
    }

    const frameTypes = await db.frameType.findMany({
      where: whereCondition,
      skip: skip,
      take: take,
    });

    // Get the total count of frame types for pagination
    const totalCount = await db.frameType.count({
      where: whereCondition,
    });

    res.status(200).json({
      frameTypes,
      totalCount,
      totalPages: Math.ceil(totalCount / take),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to retrieve frame types' });
  }
};

// Get a single frame type by ID
const getFrameTypeById = async (req, res) => {
  const { id } = req.params;

  try {
    const frameType = await db.frameType.findUnique({
      where: { id: parseInt(id) },
    });

    if (!frameType) {
      return res.status(404).json({ error: 'Frame type not found' });
    }

    res.status(200).json(frameType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to retrieve frame type' });
  }
};

// Update a frame type
const updateFrameType = async (req, res) => {
  const { id } = req.params;
  const { code, name } = req.body;

  try {
    const updatedFrameType = await db.frameType.update({
      where: { id: parseInt(id) },
      data: { code, name },
    });
    res.status(200).json(updatedFrameType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to update frame type' });
  }
};

// Delete a frame type
const deleteFrameType = async (req, res) => {
  const { id } = req.params;

  try {
    await db.frameType.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send(); // No content to return after deletion
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to delete frame type' });
  }
};

// Export the frame type controller functions
module.exports = {
  createFrameType,
  getAllFrameTypes,
  getFrameTypeById,
  updateFrameType,
  deleteFrameType,
};
