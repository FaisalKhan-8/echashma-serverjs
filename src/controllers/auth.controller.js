const db = require('../utils/db.config.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { LoginUserSchema, UpdateUserSchema } = require('../schema/user.js');
const { AppError } = require('../errors/AppError.js');
const { z } = require('zod');
const upload = require('../middleware/upload.js');

const { hashSync, compare } = bcrypt;

//TODO: user and company only take one email also for name
const CreateUser = async (req, res, next) => {
  try {
    console.log('Request body:', req.body); // In production, consider using a logger

    const {
      email,
      password,
      phone,
      companyName,
      contactPerson,
      address,
      gst,
      role,
    } = req.body;

    const userRole = req.user.role; // Role of the logged-in user
    const userCompanyId = req.user.companyId; // For SUBADMIN, their assigned company ID

    console.log(role, 'roleee');
    console.log(userCompanyId, 'userCompanyId');

    // Validate required fields manually
    if (!password) {
      return next(
        new AppError('Missing required fields: password is mandatory', 400)
      );
    }

    // Extract file paths for pancard and aadhaarcard
    let pancardPath = null;
    let aadhaarcardPath = null;

    if (req.files) {
      pancardPath = req.files?.pancard ? req.files.pancard[0].path : null;
      aadhaarcardPath = req.files?.adharcard
        ? req.files.adharcard[0].path
        : null;
    }

    let companyId = null;
    let finalEmail = email; // Default to the user-provided email
    let finalName = contactPerson || req.body.name;

    // Start a transaction
    const result = await db.$transaction(async (prisma) => {
      // Handle company creation first, only if user has the "SUPER_ADMIN" role
      if (companyName && userRole === 'SUPER_ADMIN') {
        // Ensure that companyName is provided
        if (!companyName) {
          throw new AppError(
            'Company name is required to create a company!',
            400
          );
        }

        // Ensure that the company doesn't already exist
        const existingCompany = await prisma.company.findUnique({
          where: { companyName },
        });

        if (existingCompany) {
          return next(
            new AppError('Company already exists with the same name.', 400)
          );
        }

        if (!phone) {
          return next(
            new AppError('Missing required fields: phone is mandatory', 400)
          );
        }

        // Validate phone format (example: basic phone validation for 10-digit numbers)
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phone)) {
          return next(
            new AppError(
              'Invalid phone number format. It should be 10 digits.',
              400
            )
          );
        }

        const existingUser = await prisma.user.findUnique({
          where: { email: finalEmail },
        });

        if (existingUser) {
          return next(new AppError('User already exists with this email', 400));
        }

        const existingCompanyEmail = await prisma.company.findUnique({
          where: { email: finalEmail },
        });

        if (existingCompanyEmail) {
          throw new AppError('Company already exists with this email!', 400);
        }

        // Create the company
        const newCompany = await prisma.company.create({
          data: {
            companyName,
            address: address || null,
            contactPerson: contactPerson || null,
            phone: phone || null,
            email: email || finalEmail, // Use company email if provided, otherwise use user email
            gst: gst || null,
            pancard: pancardPath,
            aadhaarcard: aadhaarcardPath,
          },
        });

        console.log('Company created:', newCompany);

        // Set the companyId to be assigned to the user later
        companyId = newCompany.id;
      } else if (userRole === 'ADMIN') {
        // Ensure ADMIN can only create SUBADMIN or MANAGER users
        if (!userCompanyId) {
          throw new AppError(
            'Unauthorized: ADMIN must be assigned to a company',
            403
          );
        }

        companyId = userCompanyId;

        // Only allow ADMIN to create SUBADMIN or MANAGER
        if (role && role !== 'SUBADMIN' && role !== 'MANAGER') {
          throw new AppError(
            'Unauthorized: ADMIN can only create SUBADMIN or MANAGER users',
            403
          );
        }
      } else if (userRole === 'SUBADMIN') {
        // Ensure SUBADMIN can only create MANAGER or SUBADMIN users, but not ADMIN
        if (!userCompanyId) {
          throw new AppError(
            'Unauthorized: SUBADMIN must be assigned to a company',
            403
          );
        }

        companyId = userCompanyId;

        // Ensure SUBADMIN can create only SUBADMIN or MANAGER, but NOT ADMIN
        if (role && role === 'ADMIN') {
          throw new AppError(
            'Unauthorized: SUBADMIN cannot create ADMIN users',
            403
          );
        }

        // Ensure SUBADMIN can create only SUBADMIN or MANAGER users
        if (role && role !== 'MANAGER' && role !== 'SUBADMIN') {
          throw new AppError(
            'Unauthorized: SUBADMIN can only create SUBADMIN or MANAGER users',
            403
          );
        }
      }

      // Now create the user after company creation
      const existingUser = await prisma.user.findUnique({
        where: { email: finalEmail },
      });

      if (existingUser) {
        return next(new AppError('User already exists with this email', 400));
      }

      // Hash the password
      const hashedPassword = hashSync(password, 10);

      console.log(hashedPassword, 'hashedPassword');

      // Create the user
      const newUser = await prisma.user.create({
        data: {
          email: finalEmail, // Use the final email
          password: hashedPassword,
          password_visible: password,
          name: finalName || req.body.contactPerson || req.body.name, // Use final name (contact person or default)
          role: role || 'MANAGER', // Default to "MANAGER" if role is not specified
          companyId: companyId, // Assign company ID to the user
        },
      });

      console.log('New User created:', newUser);

      return { user: newUser, companyId };
    });

    // If everything is successful, send the response
    res.status(201).json({
      message: 'User created successfully!',
      user: result.user,
      companyId: result.companyId,
    });
  } catch (error) {
    console.log('Error ----> ', error);

    // Handle specific errors
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    next(error); // Pass any other errors to the error-handling middleware
  }
};

const Login = async (req, res, next) => {
  try {
    // Validate request body using Zod schema
    LoginUserSchema.parse(req.body);
    const { email, password } = req.body;

    console.log(req.body, 'user credentials');

    // Fetch user from the database without company details first
    let user = await db.user.findFirst({
      where: { email },
      include: {},
    });

    console.log(user, 'user details found');

    if (!user) {
      return next(new AppError('User does not exist!', 404));
    }

    // If user is not Admin, include company details
    if (user.role !== 'SUPER_ADMIN') {
      user = await db.user.findFirst({
        where: { email },
        include: {
          company: true,
          branches: true, // Ensure branches are included if not SUPER_ADMIN
        },
      });

      console.log(user, ' <===');
    }

    // Check if password is valid
    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      return next(new AppError('Invalid credentials!', 401));
    }

    console.log(isPasswordValid, 'isPasswordValid');

    // Extract the branchId from the first branch in the branches array (if available)
    const branchId =
      Array.isArray(user.branches) && user.branches.length > 0
        ? user.branches[0]?.id
        : null;

    console.log(branchId, 'is Branch');

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        companyId: user.companyId,
        branchId: branchId, // Send branchId as part of the token
      },
      process.env.JWT_SECRET
    );

    // Send response with user details and JWT token
    res.status(200).json({
      status: 'success',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        company: user.company, // Include company details if not Admin
        branchId: branchId, // Include branchId
      },
      token,
    });
  } catch (error) {
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

const GetAllUser = async (req, res, next) => {
  try {
    const { role, companyId: userCompanyId } = req.user; // Assumes `req.user` contains the authenticated user's info
    const {
      page = 1,
      limit = 10,
      searchTerm = '',
      companyId: queryCompanyId,
    } = req.query; // Pagination and search parameters

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

    // Initialize the where condition
    let whereCondition = { ...searchConditions };

    switch (role) {
      case 'SUPER_ADMIN':
        // SUPER_ADMIN: Can view users from all companies, optionally filtered by companyId in the query
        if (queryCompanyId) {
          whereCondition.companyId = parseInt(queryCompanyId, 10) || undefined; // Filter by companyId from query if provided
        }

        users = await db.user.findMany({
          where: whereCondition,
          skip: offset,
          take: limitNum,
          include: {
            company: true, // Include company details for users
          },
        });

        totalUsers = await db.user.count({
          where: whereCondition,
        });
        break;

      case 'ADMIN':
      case 'SUBADMIN':
        // ADMIN & SUBADMIN: Can view users in their own company
        if (!userCompanyId) {
          return res.status(400).json({
            error: 'No company associated with the user.',
          });
        }

        whereCondition.companyId = userCompanyId; // Restrict users to their own company

        users = await db.user.findMany({
          where: whereCondition,
          skip: offset,
          take: limitNum,
          include: {
            company: true,
          },
        });

        totalUsers = await db.user.count({
          where: whereCondition,
        });
        break;

      case 'MANAGER':
        // MANAGER: Not allowed to view users
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
    console.error('Error in GetAllUser:', error);
    next(error); // Pass the error to error-handling middleware
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

  // TODO: handle company profile edit
  console.log(req.user, 'user token');
  console.log(id, 'user id');

  const { email, password, name, avatar } = req.body; // Added companyId to the destructuring

  console.log(req.body, 'request body');

  try {
    // Validate request body using Zod schema
    UpdateUserSchema.parse(req.body);

    // Find the user to be updated
    const existingUser = await db.user.findUnique({
      where: { id: parseInt(id) },
    });

    console.log(existingUser, 'updated');

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

    // Update the user with the new data
    const updatedUser = await db.user.update({
      where: { id: parseInt(id) },
      data: {
        email: email || existingUser.email,
        password: hashedPassword,
        name: name || existingUser.name,
        avatar: avatar || existingUser.avatar,
        companyId: existingUser.companyId, // Company ID remains unchanged if not provided in the request body
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
  const { userId, role, companyId } = req.user; // userId is the ID of the logged-in user

  try {
    // Find the user to be deleted
    const existingUser = await db.user.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingUser) {
      throw new AppError('User not found!', 404);
    }

    // Skip the companyId check for SUPER_ADMIN, as they can delete any user
    if (role !== 'SUPER_ADMIN' && existingUser.companyId !== companyId) {
      throw new AppError(
        'You can only delete users from your own company!',
        403
      );
    }

    // Role-based deletion checks
    // Check if user trying to delete is SUPER_ADMIN
    if (role === 'SUPER_ADMIN') {
      // SUPER_ADMIN can delete any user, regardless of company
      // No restrictions for SUPER_ADMIN
    }
    // Check if user trying to delete is ADMIN
    else if (role === 'ADMIN') {
      // ADMIN cannot delete another ADMIN, including themselves
      if (existingUser.role === 'ADMIN') {
        throw new AppError(
          'ADMIN cannot delete another ADMIN or themselves',
          403
        );
      }

      // ADMIN can only delete SUBADMIN and MANAGER
      if (existingUser.role !== 'SUBADMIN' && existingUser.role !== 'MANAGER') {
        throw new AppError(
          'ADMIN can only delete SUBADMIN and MANAGER users',
          403
        );
      }
    }
    // Check if user trying to delete is SUBADMIN
    else if (role === 'SUBADMIN') {
      // SUBADMIN can only delete MANAGER users
      if (existingUser.role !== 'MANAGER') {
        throw new AppError('SUBADMIN can only delete MANAGER users', 403);
      }
    }

    // If the checks pass, delete the user
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
    const whereCondition =
      role === 'SUPER_ADMIN' ? {} : { companyId: companyId };

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

const CreateFirstAdmin = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    // Check if an Admin already exists
    const existingAdmin = await db.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });

    if (existingAdmin) {
      throw new AppError(
        'Admin already exists. Use an existing Admin to create new users.',
        400
      );
    }

    // Hash the password
    const hashedPassword = hashSync(password, 10);

    // Create the first Admin
    const firstAdmin = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        password_visible: password, // Optional: consider removing in production
        name: name || 'Admin User',
        role: 'SUPER_ADMIN',
        avatar:
          'https://img.freepik.com/free-vector/illustration-businessman_53876-5856.jpg', // Default avatar
      },
    });

    res.status(201).json({
      message: 'First Super Admin created successfully!',
      user: firstAdmin,
    });
  } catch (error) {
    next(error);
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
  CreateFirstAdmin,
};
