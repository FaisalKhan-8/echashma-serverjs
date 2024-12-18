const { AppError } = require('../errors/AppError.js');
const {
  CreateBranchSchema,
  UpdateBranchSchema,
} = require('../schema/branch.js');
const db = require('../utils/db.config.js');
const { z } = require('zod');

const createBranch = async (req, res, next) => {
  try {
    // Validate request body
    const parsedBody = CreateBranchSchema.parse(req.body);

    const {
      branchName,
      address,
      contactPerson,
      phone,
      email,
      companyId,
      userIds,
    } = parsedBody;

    // Check if the company exists if companyId is provided
    if (companyId) {
      const existingCompany = await db.company.findUnique({
        where: { id: companyId },
      });

      if (!existingCompany) {
        throw new AppError('Company not found!', 404);
      }

      // Check if the branch already exists for this company
      const existingBranch = await db.branch.findFirst({
        where: {
          branchName: branchName,
          companyId: companyId,
        },
      });

      if (existingBranch) {
        throw new AppError(
          'Branch with this name already exists in this company!',
          409
        );
      }
    }

    // Check if userIds is provided and ensure they are valid
    let userIdsAsIntegers = [];
    if (userIds && userIds.length > 0) {
      userIdsAsIntegers = userIds.map((id) => parseInt(id)); // Ensure IDs are integers
      const existingUsers = await db.user.findMany({
        where: {
          id: {
            in: userIdsAsIntegers,
          },
        },
      });

      // Check if all userIds are found in the existing users
      if (existingUsers.length !== userIdsAsIntegers.length) {
        throw new AppError('One or more users not found!', 404);
      }
    }

    // Create the new branch in the database
    const newBranch = await db.branch.create({
      data: {
        branchName,
        address,
        contactPerson,
        phone,
        email,
        ...(companyId && {
          company: {
            connect: { id: companyId },
          },
        }),
        ...(userIds && {
          users: {
            connect: userIdsAsIntegers.map((userId) => ({ id: userId })), // Ensure user IDs are integers
          },
        }),
      },
      include: {
        // Include users in the response to verify connections
        users: true,
      },
    });

    console.log('New Branch:', newBranch);

    // Return a successful response
    res.status(201).json({
      message: 'Branch created successfully!',
      branch: newBranch,
    });
  } catch (error) {
    console.error('Error in createBranch:', error); // Log the error

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: error.errors,
      });
    }

    next(error);
  }
};

const getBranches = async (req, res, next) => {
  try {
    const { userId, role, companyId } = req.user; // Assumes `req.user` contains the authenticated user's info
    const { page = 1, limit = 10, searchTerm = '' } = req.query; // Pagination and search parameters

    console.log(req.user);

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    let branches, totalBranches;
    const searchConditions = searchTerm
      ? {
          branchName: {
            contains: searchTerm, // Filter branches by name
          },
        }
      : {};

    switch (role) {
      case 'ADMIN':
        // Admin: Can see all branches, no companyId filter needed
        branches = await db.branch.findMany({
          where: {
            ...searchConditions,
          },
          skip: offset,
          take: limitNum,
          include: {
            company: true, // Include company details for branches
          },
        });

        totalBranches = await db.branch.count({
          where: {
            ...searchConditions,
          },
        });
        break;

      case 'SUBADMIN':
        // Subadmin: Can see branches in their company, filter by companyId
        branches = await db.branch.findMany({
          where: {
            companyId: companyId, // Filter by companyId
            ...searchConditions,
          },
          skip: offset,
          take: limitNum,
          include: {
            company: true, // Include company details for branches
          },
        });

        totalBranches = await db.branch.count({
          where: {
            companyId: companyId, // Count branches in their company
            ...searchConditions,
          },
        });
        break;

      case 'MANAGER':
        // Manager: Can only see branches assigned to them in their company
        branches = await db.branch.findMany({
          where: {
            companyId: companyId, // Filter by companyId
            managers: {
              some: {
                id: userId, // Only branches assigned to this manager
              },
            },
            ...searchConditions,
          },
          skip: offset,
          take: limitNum,
          include: {
            company: true, // Include company details for branches
          },
        });

        totalBranches = await db.branch.count({
          where: {
            companyId: companyId, // Count branches in their company
            managers: {
              some: {
                id: userId, // Ensure the branch is assigned to this manager
              },
            },
            ...searchConditions,
          },
        });
        break;

      default:
        // Unauthorized role
        return res.status(403).json({
          error: 'Unauthorized role for accessing branches.',
        });
    }

    return res.status(200).json({
      message: `${role} branches retrieved successfully!`,
      branches,
      total: totalBranches,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error('Error in getBranches:', error);
    next(error); // Pass the error to the error handling middleware
  }
};

const updateBranch = async (req, res, next) => {
  try {
    const branchId = parseInt(req.params.id);
    console.log('Updating branch ID:', branchId);

    const parsedBody = UpdateBranchSchema.parse(req.body);
    console.log('Parsed body for update:', parsedBody);

    const existingBranch = await db.branch.findUnique({
      where: { id: branchId },
    });

    if (!existingBranch) {
      throw new AppError('Branch not found!', 404);
    }

    const updatedBranch = await db.branch.update({
      where: { id: branchId },
      data: {
        ...parsedBody,
      },
      include: {
        users: true,
      },
    });

    console.log('Updated Branch:', updatedBranch);

    res.status(200).json({
      message: 'Branch updated successfully!',
      branch: updatedBranch,
    });
  } catch (error) {
    console.error('Error in updateBranch:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: error.errors,
      });
    }

    next(error);
  }
};

// Delete Branch function
const deleteBranch = async (req, res, next) => {
  try {
    const branchId = parseInt(req.params.id); // Assuming the branch ID is in the URL params

    // Check if the branch exists
    const existingBranch = await db.branch.findUnique({
      where: { id: branchId },
    });

    if (!existingBranch) {
      throw new AppError('Branch not found!', 404);
    }

    // Delete the branch from the database
    await db.branch.delete({
      where: { id: branchId },
    });

    res.status(204).json({
      message: 'Branch deleted successfully!',
    });
  } catch (error) {
    console.error('Error in deleteBranch:', error);
    next(error);
  }
};

module.exports = {
  createBranch,
  getBranches,
  updateBranch,
  deleteBranch,
};
