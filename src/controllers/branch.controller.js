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
    const { companyId, role } = req.user;

    const { branchName, address, contactPerson, phone, email, userIds } =
      parsedBody;

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

    // Handle Prisma error for unique constraint violation (P2002)
    if (error.code === 'P2002') {
      return next(
        new AppError(
          'Branch with this name already exists in this company!',
          409
        )
      );
    }

    next(error);
  }
};

const getBranches = async (req, res, next) => {
  try {
    const { userId, role, companyId } = req.user; // Destructuring user data from req.user
    const {
      page = 1,
      limit = 10,
      searchTerm = '',
      companyId: queryCompanyId,
    } = req.query; // Destructuring query params and checking for companyId in query

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

    // Convert queryCompanyId to an integer if provided
    const parsedCompanyId = queryCompanyId
      ? parseInt(queryCompanyId, 10)
      : undefined;

    switch (role) {
      case 'SUPER_ADMIN':
        // SUPER_ADMIN: Can see all branches, but if companyId is provided in query, show branches of that company
        const superAdminCompanyId = parsedCompanyId;

        branches = await db.branch.findMany({
          where: {
            companyId: superAdminCompanyId, // If companyId is provided in query, filter by it, otherwise show branches from all companies
            ...searchConditions, // Apply search term if present
          },
          skip: offset,
          take: limitNum,
          include: {
            company: true, // Include company details for branches
            users: true, // Include users assigned to branches
          },
        });

        totalBranches = await db.branch.count({
          where: {
            companyId: superAdminCompanyId, // Count branches by companyId, if specified
            ...searchConditions, // Apply search term if present
          },
        });
        break;

      case 'ADMIN':
        // ADMIN: Can see all branches within their own company, filter by companyId
        if (!companyId) {
          return res.status(400).json({
            error: 'Company ID is required for ADMIN role.',
          });
        }

        branches = await db.branch.findMany({
          where: {
            companyId: companyId, // Filter by companyId
            ...searchConditions, // Apply search term if present
          },
          skip: offset,
          take: limitNum,
          include: {
            company: true, // Include company details for branches
            users: true,
          },
        });

        totalBranches = await db.branch.count({
          where: {
            companyId: companyId, // Count branches within their company
            ...searchConditions, // Apply search term if present
          },
        });
        break;

      case 'SUBADMIN':
        // SUBADMIN: Can only see branches they are assigned to within their company
        if (!companyId) {
          return res.status(400).json({
            error: 'Company ID is required for SUBADMIN role.',
          });
        }

        // branches = await db.branch.findMany({
        //   where: {
        //     companyId: companyId, // Filter by companyId
        //     subadmins: {
        //       some: {
        //         id: userId, // Only branches assigned to this subadmin
        //       },
        //     },
        //     ...searchConditions, // Apply search term if present
        //   },
        //   skip: offset,
        //   take: limitNum,
        //   include: {
        //     company: true, // Include company details for branches
        //     users: true,
        //   },
        // });

        branches = await db.branch.findMany({
          where: {
            companyId: companyId, // Filter by companyId
            ...searchConditions, // Apply search term if present
          },
          skip: offset,
          take: limitNum,
          include: {
            company: true, // Include company details for branches
            users: true,
          },
        });

        totalBranches = await db.branch.count({
          where: {
            companyId: companyId, // Count branches within their company
            ...searchConditions, // Apply search term if present
          },
        });
        break;

      // totalBranches = await db.branch.count({
      //   where: {
      //     companyId: companyId, // Count branches in their company
      //     subadmins: {
      //       some: {
      //         id: userId, // Ensure the subadmin is assigned to this branch
      //       },
      //     },
      //     ...searchConditions, // Apply search term if present
      //   },
      // });
      // break;

      case 'MANAGER':
        // MANAGER: Can only see branches they are assigned to within their company
        if (!companyId) {
          return res.status(400).json({
            error: 'Company ID is required for MANAGER role.',
          });
        }

        branches = await db.branch.findMany({
          where: {
            companyId: companyId, // Filter by companyId
            managers: {
              some: {
                id: userId, // Only branches assigned to this manager
              },
            },
            ...searchConditions, // Apply search term if present
          },
          skip: offset,
          take: limitNum,
          include: {
            company: true, // Include company details for branches
            users: true,
          },
        });

        totalBranches = await db.branch.count({
          where: {
            companyId: companyId, // Count branches in their company
            managers: {
              some: {
                id: userId, // Ensure the manager is assigned to this branch
              },
            },
            ...searchConditions, // Apply search term if present
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

async function getBranchById(req, res, next) {
  try {
    const { branchId } = req.params; // Extract branchId from the route parameters
    const { role } = req.user; // Get the role from the authenticated user

    console.log(req.user, 'user');

    // Validate branchId
    if (!branchId || isNaN(branchId)) {
      throw new AppError('Invalid companyId provided', 400);
    }

    // Validate role: Only SUPER_ADMIN, ADMIN, and SUB_ADMIN are allowed
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'SUBADMIN', 'MANAGER'];
    if (!allowedRoles.includes(role)) {
      throw new AppError(
        'Forbidden: You do not have permission to access this resource',
        403
      );
    }

    // Fetch the branch based on branchId
    const branch = await db.branch.findUnique({
      where: { id: Number(branchId) },
      include: {
        users: true,
        company: true,
      },
    });

    console.log(branch, 'branch');

    // If no branch is found, return a 404 error
    if (!branch) {
      throw new AppError('Branch not found', 404);
    }

    // Return the branch and related data
    return res.status(200).json({ branch });
  } catch (error) {
    // Handle unexpected errors
    console.error(error);
    next(error);
  }
}

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
  getBranchById,
  updateBranch,
  deleteBranch,
};
