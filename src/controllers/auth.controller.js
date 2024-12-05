const db = require('../utils/db.config.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  CreateUserSchema,
  LoginUserSchema,
  UpdateUserSchema,
} = require('../schema/user.js');
const { AppError } = require('../errors/AppError.js');
const { z } = require('zod');
const { Roles } = require('../schema/roles.enum.js');

const { hashSync, compare } = bcrypt;

const CreateUser = async (req, res, next) => {
  try {
    // Validate request body using Zod schema
    CreateUserSchema.parse(req.body);

    const { email, password, name, avatar, role, companyId } = req.body;

    const userRole = req.user.role;

    // Check if the user has permission to create a user
    if (userRole !== 'ADMIN' && userRole !== 'SUBADMIN') {
      throw new AppError(
        'Unauthorized: Only ADMIN and SUBADMIN can create users',
        403
      );
    }

    // Check if the user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('User already exists!', 400);
    }

    if (companyId) {
      const companyExists = await db.company.findUnique({
        where: { id: companyId },
      });

      if (!companyExists) {
        throw new AppError('Invalid company ID', 404);
      }
    }

    // Hash the password
    const hashedPassword = hashSync(password, 10);

    // Create the user
    const newUser = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        password_visible: password,
        name,
        avatar:
          avatar ||
          'https://img.freepik.com/free-vector/illustration-businessman_53876-5856.jpg',
        role: role || 'MANAGER', // Default to MANAGER if no role is provided
        companyId: companyId || null, // Assign the user to a specific company
      },
      include: {
        company: true, // Corrected from 'companies' to 'company'
      },
    });

    // Respond with success message and user data
    res.status(201).json({
      message: 'User created successfully!',
      user: newUser,
    });
  } catch (error) {
    // Handle Zod validation errors
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

const Login = async (req, res, next) => {
  try {
    // Validate request body using Zod schema
    LoginUserSchema.parse(req.body);
    const { email, password } = req.body;

    // Check if the user exists and the password is correct
    let user = await db.user.findFirst({
      where: { email },
      include: {
        company: true, // Include company details in the response
      },
    });

    console.log(user);

    if (!user) {
      return next(new AppError('User does not exist!', 404));
    }

    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      return next(new AppError('Invalid credentials!', 401));
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        companyId: user.companyId,
      },

      process.env.JWT_SECRET
    );

    res.status(200).json({ status: 'success', user, token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      // If Zod validation fails, respond with validation errors
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: error.errors,
      });
    }
    next(error);
  }
};

const GetAllUser = async (req, res, next) => {
  try {
    const { userId, role, companyId } = req.user;
    const { page = 1, limit = 10, searchTerm = '' } = req.query;

    console.log(req.user);

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    let users, totalUsers;
    const searchConditions = searchTerm
      ? {
          OR: [
            { name: { contains: searchTerm } },
            { email: { contains: searchTerm } },
          ],
        }
      : {};

    switch (role) {
      case 'ADMIN':
        // Admin: Can see all users and include company details
        users = await db.user.findMany({
          where: {
            companyId: companyId, // Admin can see users in their company
            ...searchConditions,
          },
          skip: offset,
          take: limitNum,
          include: {
            company: true, // Include company details for users
          },
        });

        totalUsers = await db.user.count({
          where: {
            companyId: companyId,
            ...searchConditions,
          },
        });
        break;

      case 'SUBADMIN':
        // SUBADMIN: Can see users in their company
        users = await db.user.findMany({
          where: {
            companyId: companyId, // Filter users by companyId
            ...searchConditions,
          },
          skip: offset,
          take: limitNum,
          include: {
            company: true, // Include company details for users
          },
        });

        totalUsers = await db.user.count({
          where: {
            companyId: companyId, // Count users in their company
            ...searchConditions,
          },
        });
        break;

      case 'MANAGER':
        // Manager: Not allowed to view users
        return res.status(403).json({
          error: 'You do not have permission to view users.',
        });

      default:
        // Unauthorized role
        return res.status(403).json({
          error: 'Unauthorized role for accessing users.',
        });
    }

    return res.status(200).json({
      message: `${role} users retrieved successfully!`,
      users,
      total: totalUsers,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error('Error in getUsers:', error);
    next(error);
  }
};

const GetLoggedInUser = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Fetch the logged-in user's details from the database
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        company: true,
        branches: true,
        // Include company details if needed
      },
    });

    // Check if the user exists
    if (!user) {
      throw new AppError('User not found!', 404);
    }

    // Respond with the user's profile
    res.status(200).json({
      status: 'success',
      user,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    next(new AppError('Failed to fetch user profile', 500));
  }
};

const UpdateUser = async (req, res, next) => {
  const { id } = req.params;
  const { email, password, name, avatar, role, companyId } = req.body;
  try {
    // Validate request body using Zod schema
    UpdateUserSchema.parse(req.body);

    // Find the user to be updated
    const existingUser = await db.user.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingUser) {
      throw new AppError('User not found!', 404);
    }

    // Check if the email is already taken by another user
    if (email && email !== existingUser.email) {
      const emailExists = await db.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        throw new AppError('Email already in use by another user!', 400);
      }
    }

    // Hash the new password if provided
    let hashedPassword = existingUser.password;
    if (password) {
      hashedPassword = hashSync(password, 10);
    }

    // Check if the provided company exists (optional step if companyId is present)
    let company = null;
    if (companyId) {
      company = await db.companies.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        throw new AppError('Company not found!', 404);
      }
    }

    // Update the user with the new data
    const updatedUser = await db.user.update({
      where: { id: parseInt(id) },
      data: {
        email: email || existingUser.email,
        password: hashedPassword,
        name: name || existingUser.name,
        avatar: avatar || existingUser.avatar,
        role: role || existingUser.role,
        companyId: companyId || existingUser.companyId, // Optional company assignment
      },
    });

    // Respond with success message and updated user data
    res.status(200).json({
      message: 'User updated successfully!',
      user: updatedUser,
    });
  } catch (error) {
    // Handle Zod validation errors
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

// TODO: Delete user api
const DeleteUser = async (req, res, next) => {
  const { id } = req.params;

  try {
    // Find the user to be deleted
    const existingUser = await db.user.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingUser) {
      throw new AppError('User not found!', 404);
    }

    // Delete the user
    await db.user.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({
      message: 'User deleted successfully!',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    next(new AppError('Failed to delete user', 500));
  }
};

const GetRecentUsers = async (req, res, next) => {
  try {
    const { role, companyId } = req.user;

    // Admin: Fetch all users, Subadmin: Fetch only users from their own company
    const whereCondition = role === 'ADMIN' ? {} : { companyId: companyId };

    // Fetch the last 5 users created, sorted by creation date (descending)
    const recentUsers = await db.user.findMany({
      where: whereCondition, // Use the appropriate condition based on the role
      orderBy: {
        created_at: 'desc', // Sort by creation date in descending order
      },
      take: 5,
      include: {
        company: true,
        branches: true, // Include company and branch details if needed
      },
    });

    res.json(recentUsers);
  } catch (error) {
    console.error('Error fetching recent users:', error);
    res
      .status(500)
      .json({ message: 'Error fetching recent users', error: error.message });
  }
};

module.exports = {
  CreateUser,
  Login,
  GetAllUser,
  GetLoggedInUser,
  UpdateUser,
  DeleteUser,
  GetRecentUsers,
};
