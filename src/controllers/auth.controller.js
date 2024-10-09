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

const { hashSync, compare } = bcrypt;

const CreateUser = async (req, res, next) => {
  try {
    // Validate request body using Zod schema
    CreateUserSchema.parse(req.body);

    const { email, password, name, avatar, role, companyId = [] } = req.body;

    // Check if the user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('User already exists!', 400);
    }

    // Hash the password
    const hashedPassword = hashSync(password, 10);

    // Create the new user with optional company assignment
    const newUser = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        avatar,
        role: role || 'SUBADMIN',
        companies: {
          connect: companyId.map((id) => ({ id: parseInt(id, 10) })), // Wrap ID in an object
        },
      },
      include: {
        companies: true, // Include company details in the response
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
        companies: true, // Include company details in the response
      },
    });

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
  const { search = '', page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  try {
    const users = await db.user.findMany({
      where: {
        OR: [
          {
            name: {
              contains: search.toLowerCase(),
            },
          },
          {
            email: {
              contains: search.toLowerCase(),
            },
          },
        ],
      },
      include: {
        companies: true,
      },
      skip,
      take: parseInt(limit),
    });

    res.json({
      status: 'success',
      users,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    next(new AppError('Failed to fetch users', 500));
  }
};

const GetLoggedInUser = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Fetch the logged-in user's details from the database
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        companies: true,
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

module.exports = {
  CreateUser,
  Login,
  GetAllUser,
  GetLoggedInUser,
  UpdateUser,
  DeleteUser,
};
